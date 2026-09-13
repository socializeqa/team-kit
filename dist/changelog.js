/**
 * The work log — how a project tells HQ what it shipped.
 *
 * Every Socialize project keeps a release-note file that ships in the SAME
 * commit as the work it describes. When a deploy reaches the live site,
 * the deploy posts whatever notes HQ does not already hold, and HQ is
 * what the client's portal and the house feed both read. One history,
 * one home.
 *
 * This lived as a 112-line script inside elitetouch until 2026-08-29,
 * where it worked (178 entries) and served exactly one of six projects.
 * It is here so the other five get the same machine rather than five
 * variations of it.
 *
 * Two jobs, and the second is the one that matters:
 *
 *   feed()   posts what is missing. Idempotent, and it NEVER throws —
 *            a note that cannot be filed must not fail a deploy.
 *   audit()  answers "did this change ship without a note?" so CI can
 *            refuse the push. A rule nobody enforces is how eleven of
 *            Georges's requests sat at "Waiting on us" with the work
 *            already live.
 */
const HQ_DEFAULT = "https://socialize.qa/api/changelog";
/**
 * Post every note HQ is missing, oldest first so the timeline reads in
 * order.
 *
 * The marker is HQ itself, never git. A gate that diffed the file one
 * commit deep and read only the top entry lost two notes in one hour on
 * 22 Aug 2026: a two-commit push announced one at best, and none at all
 * when the first commit already had a note on top.
 *
 * Selection is a filter, not a stop-at-the-first-known-title scan. The
 * scan version reposts the entire file the moment an already-filed note
 * is edited, because the title it was looking for no longer exists.
 */
export async function feed(config) {
    const { hq = HQ_DEFAULT, token, entries, sha = "", dry = false, max = 25, log = console.log, } = config;
    if (!token) {
        log("no changelog token — nothing sent");
        return { posted: [], skipped: 0, reason: "no token" };
    }
    if (!entries.length) {
        log("changelog is empty — nothing sent");
        return { posted: [], skipped: 0, reason: "empty" };
    }
    // A failed read means "HQ holds nothing new", not "holds everything":
    // a duplicate title is visible and fixable, a dropped note is the bug
    // this whole mechanism exists to prevent.
    let known = new Set();
    try {
        const res = await fetch(hq, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const data = (await res.json());
            known = new Set((data.entries ?? []).map((e) => e.title));
        }
        else {
            log(`HQ read failed (${res.status}) — posting everything not yet seen`);
        }
    }
    catch (error) {
        log(`HQ unreachable — ${String(error).slice(0, 120)}`);
    }
    let fresh = entries.filter((entry) => !known.has(entry.title));
    let skipped = 0;
    if (fresh.length > max) {
        skipped = fresh.length - max;
        log(`${fresh.length} unfiled notes — posting the newest ${max}, holding ${skipped}`);
        fresh = fresh.slice(0, max);
    }
    // Authored newest-first; filed oldest-first so the timeline reads right.
    fresh.reverse();
    if (!fresh.length) {
        log("HQ already has every note — nothing sent");
        return { posted: [], skipped: 0 };
    }
    const at = new Date().toISOString();
    const posted = [];
    for (const entry of fresh) {
        if (dry) {
            log(`would post: ${entry.title}`);
            posted.push(entry.title);
            continue;
        }
        try {
            const res = await fetch(hq, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: entry.title,
                    body: (entry.points ?? []).map((p) => `• ${p}`).join("\n"),
                    areas: entry.areas ?? [],
                    closes: entry.closes ?? [],
                    commit: sha,
                    deployedAt: at,
                }),
            });
            if (res.ok)
                posted.push(entry.title);
            log(`${res.ok ? "posted" : `HQ refused (${res.status})`}: ${entry.title}`);
        }
        catch (error) {
            log(`HQ unreachable for "${entry.title}" — ${String(error).slice(0, 120)}`);
        }
    }
    return { posted, skipped };
}
/**
 * Anything under these is code a person can see the result of.
 *
 * Deliberately broad. A rule that tries to be clever about which component
 * is "really" visible ends up arguing with itself, and the cost of a note
 * on an invisible change is one sentence.
 */
const VISIBLE = [
    "src/",
    "app/",
    "pages/",
    "components/",
    "lib/",
    "public/",
    "messages/",
    "locales/",
    "styles/",
];
/**
 * ...except these, which no client will ever notice.
 *
 * Tests and scripts are the honest ones: a test that changes proves the
 * behaviour did not.
 */
const INVISIBLE = [
    ".github/",
    "docs/",
    "supabase/migrations/",
    "scripts/",
    "node_modules/",
];
const INVISIBLE_FILE = /(\.test\.[tj]sx?|\.spec\.[tj]sx?|\.md|\.lock|\.log)$/;
/**
 * Did this push change something a person sees without saying what?
 *
 * The escape hatch is `[skip changelog]` in the commit message, checked by
 * the caller, not here — this function answers only the file question so
 * it stays testable.
 */
export function audit(config) {
    const { changed, changelogPath, alsoVisible = [], alsoInvisible = [] } = config;
    const visiblePrefixes = [...VISIBLE, ...alsoVisible];
    const invisiblePrefixes = [...INVISIBLE, ...alsoInvisible];
    const touchedNotes = changed.some((f) => f === changelogPath);
    const visible = changed.filter((f) => f !== changelogPath &&
        !INVISIBLE_FILE.test(f) &&
        !invisiblePrefixes.some((p) => f.startsWith(p)) &&
        visiblePrefixes.some((p) => f.startsWith(p)));
    if (!visible.length) {
        return { ok: true, visible, reason: "nothing user-visible changed" };
    }
    if (touchedNotes) {
        return { ok: true, visible, reason: "a release note ships with the change" };
    }
    return {
        ok: false,
        visible,
        reason: `${visible.length} user-visible file(s) changed with no new entry in ${changelogPath}`,
    };
}
