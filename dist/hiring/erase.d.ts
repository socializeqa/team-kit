/**
 * Erasing a candidate: what they sent, what the office wrote about them and
 * their papers go; a row that only counts stays, so a role's numbers still add
 * up. It happens for a candidate who asks to be forgotten (the panel's
 * delete), and six months after a no, as the regret letter promises. Someone
 * who was ever hired is never erased.
 *
 * The app runs it on its service key (staff may not edit what a candidate
 * sent): remove the papers first, then write `erasedRow()` over the row, blank
 * the story lines that could hold the person's words, delete the office's
 * notes, and add a last story line of kind "erased" saying why.
 */
/** A turned-down application is kept this long after the no, then erased. */
export declare const KEEP_REJECTED_DAYS = 183;
/** A deleted one is erased at once; this catches any that were not. */
export declare const KEEP_DELETED_DAYS = 1;
/** Story kinds whose words name only the role and the stage, never the person: kept when the rest is blanked. */
export declare const PLAIN_STORY_KINDS: readonly ["applied", "stage", "erased"];
/**
 * The values that blank a candidate's personal data, for the columns every
 * team app's `applications` table has. An app with more personal columns (a
 * single `notes` box, say) blanks those beside it.
 */
export declare function erasedRow(now?: Date): {
    readonly name: "Erased";
    readonly email: "erased@invalid";
    readonly phone: "";
    readonly whatsapp: null;
    readonly gender: null;
    readonly age: null;
    readonly has_qid: null;
    readonly nationality: null;
    readonly portfolio_url: null;
    readonly portfolio_path: null;
    readonly cv_path: null;
    readonly cover_note: null;
    readonly answers: readonly [];
    readonly rating: null;
    readonly fit_verdict: null;
    readonly source: null;
    readonly submit_key: null;
    readonly erased_at: string;
};
/**
 * Why an application is due to be erased now, or null when it is not. The
 * six months count from the no itself (`stageAt`, when the stage last
 * changed), never from the row's last touch: a note or a rating must not
 * keep a person on file longer than the letter said.
 */
export declare function dueForErasing(a: {
    stage: string;
    stageAt: string | null;
    deletedAt: string | null;
    erasedAt: string | null;
    everHired: boolean;
}, now?: Date): "rejected" | "deleted" | null;
/** The moments a query compares with: no before `rejected`, deleted before `deleted`, means due. */
export declare function eraseCutoffs(now?: Date): {
    rejected: string;
    deleted: string;
};
