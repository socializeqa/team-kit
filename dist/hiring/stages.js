/**
 * The walk a candidate takes, from a new application to a hire or a no: the
 * stages, what each is called, how a chip shows it, and which moves a panel's
 * mover offers from each. Pure, so the drawer, the table and the server all
 * read the same words.
 */
import { LANGUAGE_NAMES, isLocale } from "./locale.js";
export const APPLICATION_STAGES = ["new", "shortlist", "invited", "interview", "trial", "offer", "hired", "rejected"];
export function isStage(value) {
    return APPLICATION_STAGES.includes(value);
}
/** The stages still waiting on the office, for the "to answer" filter. */
export const OPEN_STAGES = ["new", "shortlist", "invited", "interview", "trial", "offer"];
const LABELS = {
    en: {
        new: "New",
        shortlist: "Shortlist",
        invited: "Invited for interview",
        interview: "Interview",
        trial: "Trial task",
        offer: "Offer",
        hired: "Hired",
        rejected: "Rejected",
    },
    ar: {
        new: "جديد",
        shortlist: "القائمة المختصرة",
        invited: "مدعو لمقابلة",
        interview: "مقابلة",
        trial: "مهمة تجريبية",
        offer: "عرض عمل",
        hired: "تم التعيين",
        rejected: "مرفوض",
    },
};
/** One word each, where a row of stages has to fit: the strip over the list and the walk in a file. */
const SHORT = {
    en: { ...LABELS.en, invited: "Invited", trial: "Trial" },
    ar: {
        new: "جديد",
        shortlist: "ترشيح",
        invited: "مدعو",
        interview: "مقابلة",
        trial: "تجربة",
        offer: "عرض",
        hired: "تعيين",
        rejected: "مرفوض",
    },
};
// A stage this list does not know (an app's own, or an old row) is still said, in English.
const asWord = (stage) => stage.charAt(0).toUpperCase() + stage.slice(1);
export function stageLabel(stage, locale = "en") {
    return isStage(stage) ? LABELS[locale][stage] : asWord(stage);
}
export function stageShort(stage, locale = "en") {
    return isStage(stage) ? SHORT[locale][stage] : asWord(stage);
}
/**
 * A stage on a chip, the same in the row and the file: a new knock and a hire
 * glow, the middle of the walk wears the outline, the rest is quiet.
 */
export function stageTone(stage) {
    if (stage === "new" || stage === "hired")
        return "good";
    if (stage === "invited" || stage === "interview" || stage === "trial" || stage === "offer")
        return "work";
    return "quiet";
}
/**
 * Whether a candidate was ever hired: now, or by a move to Hired in their
 * story before a reopen. Such a file is never deleted or erased: reopening a
 * hire must not make it deletable.
 */
export function wasHired(stage, story) {
    return stage === "hired" || story.some((line) => line.kind === "stage" && line.detail === "hired");
}
/** The next stage on the walk; an offer's next is the hire. Null once settled. */
export function nextStage(stage) {
    const at = OPEN_STAGES.indexOf(stage);
    if (at < 0)
        return null;
    return OPEN_STAGES[at + 1] ?? "hired";
}
/** The stage a step back; nothing before New, and a settled file goes back by reopening. */
export function previousStage(stage) {
    const at = OPEN_STAGES.indexOf(stage);
    return at > 0 ? (OPEN_STAGES[at - 1] ?? null) : null;
}
const NEXT_LABEL = {
    new: "Shortlist",
    shortlist: "Invite for interview",
    invited: "Mark interviewed",
    interview: "Give a trial task",
    trial: "Make an offer",
};
/**
 * What the mover offers from a stage, the primary door first: the next step,
 * a step back, skipping the trial for an offer, a hire from any open stage,
 * letting them go from any open stage (with a reason), and reopening a hire
 * or a no. A press on the walk itself may still pick any stage; a reopen can
 * land anywhere the office presses, New by default.
 */
export function movesFrom(stage) {
    if (stage === "hired" || stage === "rejected") {
        return [{ kind: "reopen", to: "new", label: "Reopen", primary: true, confirm: true, reason: "optional" }];
    }
    if (!OPEN_STAGES.includes(stage))
        return [];
    const moves = [];
    const next = nextStage(stage);
    if (stage === "offer")
        moves.push({ kind: "hire", to: "hired", label: "Hire", primary: true, confirm: true, reason: "optional" });
    else if (next)
        moves.push({ kind: "next", to: next, label: NEXT_LABEL[stage] ?? stageLabel(next), primary: true, confirm: false, reason: null });
    const back = previousStage(stage);
    if (back)
        moves.push({ kind: "back", to: back, label: `Back to ${stageLabel(back).toLowerCase()}`, primary: false, confirm: false, reason: null });
    if (stage === "interview")
        moves.push({ kind: "skip", to: "offer", label: "Skip the trial, make an offer", primary: false, confirm: false, reason: null });
    if (stage !== "offer")
        moves.push({ kind: "hire", to: "hired", label: "Hire them", primary: false, confirm: true, reason: "optional" });
    moves.push({ kind: "reject", to: "rejected", label: "Let them go", primary: false, confirm: true, reason: "required" });
    return moves;
}
/** The AI reader's number, in a word a person can act on. */
export function fitWord(score) {
    if (score === null)
        return "Not read";
    if (score >= 75)
        return "Strong";
    if (score >= 50)
        return "Possible";
    return "Weak";
}
/** Fit bands for the list's filter: the same cut-offs as fitWord. */
export const FIT_BANDS = [
    { value: "strong", label: "Strong (75 and up)", from: 75, to: 100 },
    { value: "possible", label: "Possible (50 to 74)", from: 50, to: 74 },
    { value: "weak", label: "Weak (under 50)", from: 0, to: 49 },
];
/** A line of a candidate's story, said out loud. `languageName` names a letter language (English by default). */
export function eventLine(event, { languageName = (code) => (isLocale(code) ? LANGUAGE_NAMES[code] : undefined) } = {}) {
    switch (event.kind) {
        case "applied":
            return "Applied";
        case "stage":
            return `Moved to ${stageLabel(event.detail ?? "")}`;
        case "email":
            return event.detail ? `Emailed: ${event.detail}` : "Emailed";
        case "note":
            return event.detail ?? "Note";
        case "read":
            return event.detail ?? "Read by the AI reader";
        case "language":
            return `Letters now in ${languageName(event.detail ?? "") ?? "English"}`;
        default:
            return event.detail ?? event.kind;
    }
}
