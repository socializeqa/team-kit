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
export const KEEP_REJECTED_DAYS = 183;

/** A deleted one is erased at once; this catches any that were not. */
export const KEEP_DELETED_DAYS = 1;

/** Story kinds whose words name only the role and the stage, never the person: kept when the rest is blanked. */
export const PLAIN_STORY_KINDS = ["applied", "stage", "erased"] as const;

const DAY = 86_400_000;

/**
 * The values that blank a candidate's personal data, for the columns every
 * team app's `applications` table has. An app with more personal columns (a
 * single `notes` box, say) blanks those beside it.
 */
export function erasedRow(now: Date = new Date()) {
  return {
    name: "Erased",
    email: "erased@invalid",
    phone: "",
    whatsapp: null,
    gender: null,
    age: null,
    has_qid: null,
    nationality: null,
    portfolio_url: null,
    portfolio_path: null,
    cv_path: null,
    cover_note: null,
    answers: [],
    rating: null,
    fit_verdict: null,
    source: null,
    submit_key: null,
    erased_at: now.toISOString(),
  } as const;
}

/**
 * Why an application is due to be erased now, or null when it is not. The
 * six months count from the no itself (`stageAt`, when the stage last
 * changed), never from the row's last touch: a note or a rating must not
 * keep a person on file longer than the letter said.
 */
export function dueForErasing(
  a: { stage: string; stageAt: string | null; deletedAt: string | null; erasedAt: string | null; everHired: boolean },
  now: Date = new Date(),
): "rejected" | "deleted" | null {
  if (a.erasedAt || a.everHired) return null;
  const past = (at: string | null, days: number) => Boolean(at) && now.getTime() - Date.parse(at as string) > days * DAY;
  if (past(a.deletedAt, KEEP_DELETED_DAYS)) return "deleted";
  if (a.stage === "rejected" && past(a.stageAt, KEEP_REJECTED_DAYS)) return "rejected";
  return null;
}

/** The moments a query compares with: no before `rejected`, deleted before `deleted`, means due. */
export function eraseCutoffs(now: Date = new Date()): { rejected: string; deleted: string } {
  return {
    rejected: new Date(now.getTime() - KEEP_REJECTED_DAYS * DAY).toISOString(),
    deleted: new Date(now.getTime() - KEEP_DELETED_DAYS * DAY).toISOString(),
  };
}
