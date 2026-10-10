/**
 * What the apply door checks in what a form sent, each rule on its own so it
 * is tested on its own: the age, the yes/no answers, the role's questions,
 * the draft's key, and who is knocking.
 */
import { type Answer, type Question } from "./openings.js";
/**
 * The form's age, or null: a whole number within the bounds (18 to 70 by
 * default). Anything outside them is a typo, not an applicant.
 */
export declare function readAge(raw: string, { min, max }?: {
    min?: number;
    max?: number;
}): number | null;
/** Age bands for the list's filter, in the order a recruiter thinks. */
export declare const AGE_BANDS: readonly [{
    readonly value: "18-24";
    readonly label: "18 to 24";
    readonly from: 18;
    readonly to: 24;
}, {
    readonly value: "25-34";
    readonly label: "25 to 34";
    readonly from: 25;
    readonly to: 34;
}, {
    readonly value: "35-44";
    readonly label: "35 to 44";
    readonly from: 35;
    readonly to: 44;
}, {
    readonly value: "45+";
    readonly label: "45 and over";
    readonly from: 45;
    readonly to: 80;
}];
/**
 * Whether a question is answered with a yes or a no, so the form offers two
 * buttons instead of a box: one question, opening the way such a question
 * does in English ("Do you…?", "Are you…?") or in Arabic ("هل…؟"). One that
 * asks two things, or wants words, stays written.
 */
export declare function asksYesNo(prompt: string): boolean;
/** A yes/no field as the form sent it: yes, no, or null when it was never asked. */
export declare function readYesNo(raw: unknown): boolean | null;
/** The answers as the form sent them, by the question's place; only the words are taken. */
export declare function readAnswers(raw: string, max?: number): string[];
/**
 * The role's questions with the answers beside them, or null when one is
 * missing. The question's words are the opening's own, never the browser's: a
 * form could otherwise rewrite what the office and the AI reader see as the
 * question. Every question needs an answer, and a yes/no one a Yes or a No.
 */
export declare function pairAnswers(questions: readonly Question[], given: readonly string[]): Answer[] | null;
/** The one key a draft sends with every press of Send, so a double press files one application. */
export declare function readKey(value: unknown): string | null;
type HeaderReader = {
    get(name: string): string | null;
};
/**
 * The visitor's address as sent. Behind Vercel the platform writes
 * x-forwarded-for itself, so a caller cannot choose it; elsewhere, trust it
 * only behind a proxy that does the same.
 */
export declare function callerIp(headers: HeaderReader): string;
/**
 * The address a door counts tries by. An IPv4 address is one place; an IPv6
 * one is counted by its /64, the block a single home or phone is handed,
 * since one device can rotate through the rest of it and walk past a
 * per-address limit. An IPv4 address wrapped in IPv6 (::ffff:1.2.3.4) is its
 * IPv4 self.
 */
export declare function callerBucket(headers: HeaderReader): string;
export {};
