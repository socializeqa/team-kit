/**
 * The walk a candidate takes, from a new application to a hire or a no: the
 * stages, what each is called, how a chip shows it, and which moves a panel's
 * mover offers from each. Pure, so the drawer, the table and the server all
 * read the same words.
 */
import { type PanelLocale } from "./locale.js";
export declare const APPLICATION_STAGES: readonly ["new", "shortlist", "invited", "interview", "trial", "offer", "hired", "rejected"];
export type Stage = (typeof APPLICATION_STAGES)[number];
export declare function isStage(value: unknown): value is Stage;
/** The stages still waiting on the office, for the "to answer" filter. */
export declare const OPEN_STAGES: readonly Stage[];
export declare function stageLabel(stage: string, locale?: PanelLocale): string;
export declare function stageShort(stage: string, locale?: PanelLocale): string;
/**
 * A stage on a chip, the same in the row and the file: a new knock and a hire
 * glow, the middle of the walk wears the outline, the rest is quiet.
 */
export declare function stageTone(stage: string): "good" | "work" | "quiet";
/**
 * Whether a candidate was ever hired: now, or by a move to Hired in their
 * story before a reopen. Such a file is never deleted or erased: reopening a
 * hire must not make it deletable.
 */
export declare function wasHired(stage: string, story: readonly {
    kind: string;
    detail: string | null;
}[]): boolean;
/** The next stage on the walk; an offer's next is the hire. Null once settled. */
export declare function nextStage(stage: string): Stage | null;
/** The stage a step back; nothing before New, and a settled file goes back by reopening. */
export declare function previousStage(stage: string): Stage | null;
export type MoveKind = "next" | "back" | "skip" | "hire" | "reject" | "reopen";
export type Move = {
    kind: MoveKind;
    to: Stage;
    label: string;
    /** The one door under the walk; the others sit behind a menu. */
    primary: boolean;
    /** Asks before it moves: a hire, a no, and any move out of a settled file. */
    confirm: boolean;
    /** Whether that question asks why: a no always says why. */
    reason: "required" | "optional" | null;
};
/**
 * What the mover offers from a stage, the primary door first: the next step,
 * a step back, skipping the trial for an offer, a hire from any open stage,
 * letting them go from any open stage (with a reason), and reopening a hire
 * or a no. A press on the walk itself may still pick any stage; a reopen can
 * land anywhere the office presses, New by default.
 */
export declare function movesFrom(stage: string): Move[];
/** The AI reader's number, in a word a person can act on. */
export declare function fitWord(score: number | null): string;
/** Fit bands for the list's filter: the same cut-offs as fitWord. */
export declare const FIT_BANDS: readonly [{
    readonly value: "strong";
    readonly label: "Strong (75 and up)";
    readonly from: 75;
    readonly to: 100;
}, {
    readonly value: "possible";
    readonly label: "Possible (50 to 74)";
    readonly from: 50;
    readonly to: 74;
}, {
    readonly value: "weak";
    readonly label: "Weak (under 50)";
    readonly from: 0;
    readonly to: 49;
}];
/** A line of a candidate's story, said out loud. `languageName` names a letter language (English by default). */
export declare function eventLine(event: {
    kind: string;
    detail: string | null;
}, { languageName }?: {
    languageName?: (code: string) => string | undefined;
}): string;
