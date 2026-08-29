/**
 * The work log — how a project tells HQ what it shipped.
 *
 * Every fleet project keeps a release-note file that ships in the SAME
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
/** One release note, as authored in a project's changelog file. */
export interface ChangelogEntry {
    /** "YYYY-MM-DD" — the day it shipped. */
    date: string;
    title: string;
    areas?: string[];
    /** What changed, one plain sentence per point. */
    points?: string[];
    /** Socialize request ids this note closes. Naming them is what closes them. */
    closes?: string[];
}
export interface FeedConfig {
    /** HQ's changelog endpoint. */
    hq?: string;
    /** The project's own bearer token. Without it, nothing is sent. */
    token: string;
    /** Newest first, the way the file is authored. */
    entries: ChangelogEntry[];
    /** The commit this deploy carried, for the trail. */
    sha?: string;
    /** Print what would happen and post nothing. */
    dry?: boolean;
    /**
     * A ceiling on one run. If the ledger is ever wiped or a file is
     * rewritten wholesale, a hundred notes must not land on a client's
     * portal in one afternoon.
     */
    max?: number;
    log?: (line: string) => void;
}
export interface FeedResult {
    posted: string[];
    skipped: number;
    /** Set when nothing could be sent — never a thrown error. */
    reason?: string;
}
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
export declare function feed(config: FeedConfig): Promise<FeedResult>;
export interface AuditConfig {
    /** Paths changed by the push, relative to the repo root, forward slashes. */
    changed: string[];
    /** Where the project's release notes live, e.g. "lib/changelog.ts". */
    changelogPath: string;
    /** Extra paths that count as user-visible for this project. */
    alsoVisible?: string[];
    /** Extra paths that never need a note, on top of the shared list. */
    alsoInvisible?: string[];
}
export interface AuditResult {
    /** True when the push may proceed. */
    ok: boolean;
    /** The user-visible files that triggered the requirement. */
    visible: string[];
    reason: string;
}
/**
 * Did this push change something a person sees without saying what?
 *
 * The escape hatch is `[skip changelog]` in the commit message, checked by
 * the caller, not here — this function answers only the file question so
 * it stays testable.
 */
export declare function audit(config: AuditConfig): AuditResult;
