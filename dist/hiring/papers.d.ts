/**
 * Where a candidate's PDFs live in the app's private storage, in one place:
 * the upload door mints a draft, the apply door checks it and moves it home,
 * and the nightly sweep clears drafts nobody claimed.
 *
 * `prefix` is the folder inside the bucket. An app whose bucket is already
 * called `hiring` can leave it empty; one that shares a bucket names its
 * folder ("hiring" gives hiring/drafts/… and hiring/2026/…).
 */
export type HiringPapers = {
    /** The most a CV or a portfolio may weigh: 8 MB (set the bucket to refuse more too). */
    MAX_BYTES: number;
    /** Whether a path is a draft the upload door minted, the only path an application may name. */
    isDraft(path: string): boolean;
    /** A new draft's path, before its application exists. */
    draftPath(id?: string): string;
    /** Home for a filed paper: 2026/sam-example-cv-1a2b3c4d.pdf under the prefix. */
    homePath(name: string, kind: "cv" | "portfolio", id: string, year?: number): string;
};
export declare function hiringPapers({ prefix }?: {
    prefix?: string;
}): HiringPapers;
