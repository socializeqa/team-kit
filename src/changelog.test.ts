import { describe, expect, it, vi } from "vitest";
import { audit, feed } from "./changelog.js";

const note = (title: string, points: string[] = ["did a thing"]) => ({
  date: "2026-08-29",
  title,
  areas: ["Website"],
  points,
});

describe("audit — the gate that stops work shipping unannounced", () => {
  const changelogPath = "lib/changelog.ts";

  it("lets a push through when nothing user-visible changed", () => {
    const r = audit({
      changed: [".github/workflows/ci.yml", "docs/notes.md"],
      changelogPath,
    });
    expect(r.ok).toBe(true);
  });

  it("refuses a visible change with no note", () => {
    const r = audit({ changed: ["src/app/page.tsx"], changelogPath });
    expect(r.ok).toBe(false);
    expect(r.visible).toEqual(["src/app/page.tsx"]);
  });

  it("passes when the note ships in the same push", () => {
    const r = audit({
      changed: ["src/app/page.tsx", "lib/changelog.ts"],
      changelogPath,
    });
    expect(r.ok).toBe(true);
  });

  // A test changing proves the behaviour did not, so it must not be the
  // thing that demands a client-facing note.
  it("does not count tests, migrations, scripts or markdown", () => {
    const r = audit({
      changed: [
        "src/lib/money.test.ts",
        "supabase/migrations/0004_add_column.sql",
        "scripts/backup.mjs",
        "README.md",
      ],
      changelogPath,
    });
    expect(r.ok).toBe(true);
  });

  it("counts public assets and translations — a photo and a word are visible", () => {
    expect(audit({ changed: ["public/sports/karate.webp"], changelogPath }).ok).toBe(false);
    expect(audit({ changed: ["messages/ar.json"], changelogPath }).ok).toBe(false);
  });

  it("takes a project's own extra rules", () => {
    const r = audit({
      changed: ["infra/theme.css"],
      changelogPath,
      alsoVisible: ["infra/"],
    });
    expect(r.ok).toBe(false);
  });
});

describe("feed — filing the notes", () => {
  const ok = (entries: { title: string }[]) =>
    ({ ok: true, json: async () => ({ entries }) }) as Response;

  it("says so and sends nothing without a token", async () => {
    const log = vi.fn();
    const r = await feed({ token: "", entries: [note("a")], log });
    expect(r.posted).toEqual([]);
    expect(r.reason).toBe("no token");
  });

  it("posts only what HQ is missing, oldest first", async () => {
    const posts: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return ok([{ title: "old" }]);
      posts.push(JSON.parse(String(init.body)).title);
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await feed({
      token: "t",
      entries: [note("newest"), note("middle"), note("old")],
      log: () => {},
    });
    expect(posts).toEqual(["middle", "newest"]);
    expect(r.posted).toEqual(["middle", "newest"]);
    vi.unstubAllGlobals();
  });

  // The scan-until-a-known-title version reposted the whole file whenever
  // an already-filed note was edited, because the title it was looking
  // for no longer existed.
  it("does not repost the file when a filed note has been retitled", async () => {
    const posts: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return ok([{ title: "second" }, { title: "first" }]);
      posts.push(JSON.parse(String(init.body)).title);
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    await feed({
      token: "t",
      entries: [note("third"), note("second EDITED"), note("first")],
      log: () => {},
    });
    expect(posts).toEqual(["second EDITED", "third"]);
    vi.unstubAllGlobals();
  });

  it("holds back a flood rather than dumping it on a client's portal", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return ok([]);
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const many = Array.from({ length: 40 }, (_, i) => note(`n${i}`));
    const r = await feed({ token: "t", entries: many, max: 25, log: () => {} });
    expect(r.posted).toHaveLength(25);
    expect(r.skipped).toBe(15);
    vi.unstubAllGlobals();
  });

  // A deploy that already succeeded must not be failed by a note.
  it("survives HQ being unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));
    const r = await feed({ token: "t", entries: [note("a")], log: () => {} });
    expect(r.posted).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("treats a failed HQ read as 'holds nothing', never 'holds everything'", async () => {
    const posts: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      if (!init?.method) return { ok: false, status: 500 } as Response;
      posts.push(JSON.parse(String(init.body)).title);
      return { ok: true, json: async () => ({}) } as Response;
    }));
    await feed({ token: "t", entries: [note("a")], log: () => {} });
    expect(posts).toEqual(["a"]);
    vi.unstubAllGlobals();
  });
});
