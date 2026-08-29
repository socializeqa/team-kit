#!/usr/bin/env node
// The one command every fleet repo runs for its work log.
//
//   fleet-changelog feed [--dry]           file the notes this deploy carried
//   fleet-changelog check [--base <ref>]   refuse a push that ships
//                                          user-visible work with no note
//
// Config comes from the repo's package.json, so the workflow file is
// identical in every project and nothing needs arguments:
//
//   "fleetChangelog": { "path": "lib/changelog.ts", "export": "CHANGELOG" }
//
// feed reads CHANGELOG_TOKEN and, optionally, CHANGELOG_URL and SHA from
// the environment. It never exits non-zero: a note that cannot be filed
// must not fail a deploy that already succeeded.
//
// check DOES exit non-zero. That is the whole point of it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { audit, feed } from "../dist/changelog.js";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const argv = process.argv.slice(2);
const command = argv[0] ?? "feed";
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

function readConfig() {
  const pkgPath = join(ROOT, "package.json");
  if (!existsSync(pkgPath)) return {};
  return JSON.parse(readFileSync(pkgPath, "utf8")).fleetChangelog ?? {};
}

const { path: notesPath = "lib/changelog.ts", export: exportName = "CHANGELOG" } =
  readConfig();

/**
 * The notes file holds data only, so transpiling the literal is enough —
 * no bundler, no ts-node, nothing extra for a CI runner to install.
 */
async function readEntries() {
  const full = resolve(ROOT, notesPath);
  if (!existsSync(full)) {
    console.log(`no ${notesPath} in this project`);
    return null;
  }
  if (!full.endsWith(".ts")) {
    return (await import(pathToFileURL(full).href))[exportName] ?? [];
  }
  const ts = require("typescript");
  const js = ts.transpileModule(readFileSync(full, "utf8"), {
    compilerOptions: { module: "ESNext", target: "ESNext" },
  }).outputText;
  const tmp = join(tmpdir(), `fleet-changelog-${process.pid}.mjs`);
  writeFileSync(tmp, js);
  return (await import(pathToFileURL(tmp).href))[exportName] ?? [];
}

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });

async function runFeed() {
  const entries = await readEntries();
  if (entries === null) return;
  await feed({
    hq: process.env.CHANGELOG_URL,
    token: process.env.CHANGELOG_TOKEN ?? "",
    entries,
    sha: process.env.SHA ?? "",
    dry: flag("dry"),
  });
}

function runCheck() {
  // The base to compare against: the workflow passes the push's "before"
  // commit, a pull request passes the merge base. Defaults to the previous
  // commit so the command is useful by hand.
  const base = value("base", "HEAD~1");
  let changed;
  try {
    changed = git(["diff", "--name-only", base + "...HEAD"])
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    // A shallow clone or a first commit has no base to diff against.
    // Refusing a push because CI could not work out what changed is the
    // worst of both worlds — say so and let it through.
    console.log(`could not diff against ${base} — skipping the check`);
    return;
  }

  let message = "";
  try {
    message = git(["log", "-1", "--pretty=%B"]);
  } catch {
    // No message to read is not grounds to refuse a push.
  }
  if (/\[skip changelog\]/i.test(message)) {
    console.log("[skip changelog] in the commit message — check skipped");
    return;
  }

  const result = audit({ changed, changelogPath: notesPath });
  if (result.ok) {
    console.log(`OK - ${result.reason}`);
    return;
  }

  process.exitCode = 1;
  console.error(`\nRefused: ${result.reason}\n`);
  console.error("These changed and nothing says what they do:");
  for (const f of result.visible.slice(0, 20)) console.error("    " + f);
  if (result.visible.length > 20) {
    console.error(`    ...and ${result.visible.length - 20} more`);
  }
  console.error(`
Add an entry at the TOP of ${notesPath}, in this same push. Plain
sentences the client reads at first glance, never tech-speak:

    {
      date: "${new Date().toISOString().slice(0, 10)}",
      title: "What they will notice",
      areas: ["Website"],
      points: ["One plain sentence per thing that changed."],
    },

If this genuinely changes nothing anyone can see, put [skip changelog]
in the commit message and say why in the body.
`);
}

/**
 * Never call process.exit() on a path that has just awaited a fetch: on
 * Windows it aborts Node with a libuv assertion (UV_HANDLE_CLOSING) and
 * exit code 127, which would fail the deploy step this command is not
 * allowed to fail. Set process.exitCode and return instead.
 */
if (command === "feed") {
  await runFeed();
} else if (command === "check") {
  runCheck();
} else {
  console.error(`unknown command "${command}" — expected feed or check`);
  process.exitCode = 2;
}
