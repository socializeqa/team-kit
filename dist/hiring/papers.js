/**
 * Where a candidate's PDFs live in the app's private storage, in one place:
 * the upload door mints a draft, the apply door checks it and moves it home,
 * and the nightly sweep clears drafts nobody claimed.
 *
 * `prefix` is the folder inside the bucket. An app whose bucket is already
 * called `hiring` can leave it empty; one that shares a bucket names its
 * folder ("hiring" gives hiring/drafts/… and hiring/2026/…).
 */
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function hiringPapers({ prefix = "" } = {}) {
    const base = prefix.replace(/^\/+|\/+$/g, "");
    const folder = base ? `${base}/` : "";
    // A draft is a UUID and nothing else, so a path can never climb into someone else's file.
    const draft = new RegExp(`^${escape(folder)}drafts/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`);
    return {
        MAX_BYTES: 8 * 1024 * 1024,
        isDraft: (path) => draft.test(path),
        draftPath: (id = globalThis.crypto.randomUUID()) => `${folder}drafts/${id}.pdf`,
        homePath: (name, kind, id, year = new Date().getUTCFullYear()) => {
            const who = name
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
