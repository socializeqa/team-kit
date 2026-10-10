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

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function hiringPapers({ prefix = "" }: { prefix?: string } = {}): HiringPapers {
  const base = prefix.replace(/^\/+|\/+$/g, "");
  const folder = base ? `${base}/` : "";
  // A draft is a UUID and nothing else, so a path can never climb into someone else's file.
  const draft = new RegExp(`^${escape(folder)}drafts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`);
  return {
    MAX_BYTES: 8 * 1024 * 1024,
    isDraft: (path) => draft.test(path),
    draftPath: (id = globalThis.crypto.randomUUID()) => `${folder}drafts/${id}.pdf`,
    homePath: (name, kind, id, year = new Date().getUTCFullYear()) => {
      const who =
        name
          .normalize("NFKD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50) || "candidate";
      return `${folder}${year}/${who}-${kind}-${id.slice(0, 8)}.pdf`;
    },
  };
}
