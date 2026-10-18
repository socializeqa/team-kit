/**
 * The candidate's six letters in every language a careers site speaks, line
 * for line the same in each. Slots are filled when a letter is built:
 * {you} and {first} (the first name), {role}, {brand} (the employer), {when},
 * {deadline}, {validUntil}, {id} (what to bring on the first day), and the
 * counted spans {reply}, {keep} and {offer} (see counts.ts).
 *
 * Arabic never puts a Latin brand or role straight before a full stop or a
 * colon: the punctuation would be laid out on the wrong side of it. Chinese
 * templates carry no spaces; a counted span or a Latin brand brings its own.
 */
import type { Locale } from "./locale.js";
type Received = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    body2: string;
    factRole: string;
    factReceived: string;
    factPapers: string;
    papersCv: string;
    papersCvPortfolio: string;
    closing: string;
};
type Invited = {
    subject: string;
    subjectWhen: string;
    eyebrow: string;
    headline: string;
    body1: string;
    body2: string;
    factWhen: string;
    factWhere: string;
    factWith: string;
    factBring: string;
    /** How long the interview runs: "45 minutes", written by Intl. */
    factLength: string;
    closing: string;
};
type Trial = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    sendBack: string;
    sendBackBy: string;
    factDeadline: string;
    closing: string;
};
type Offer = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    body2: string;
    factRole: string;
    factStart: string;
    factSalary: string;
    factProbation: string;
    closingUntil: string;
    closingDefault: string;
};
type Hired = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    /** With the employer's ID document to bring. */
    bringId: string;
    /** Without one, when the office listed things to bring. */
    bring: string;
    factDay: string;
    factWhere: string;
    factBring: string;
    factAskFor: string;
    closing: string;
};
type Rejected = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    /** body1 for someone who came in to meet the office. */
    body1Met: string;
    body2: string;
    closing: string;
};
/** A notice about an interview already booked: it moved, it is off, or it is tomorrow. */
type Notice = {
    subject: string;
    eyebrow: string;
    headline: string;
    body1: string;
    body2: string;
    closing: string;
};
export type LetterWords = {
    received: Received;
    invited: Invited;
    trial: Trial;
    offer: Offer;
    hired: Hired;
    rejected: Rejected;
    /** The interview's new time: {when} is the new moment. */
    moved: Notice;
    /** The interview called off: {when} is the moment it was. */
    cancelled: Notice;
    /** The day before. */
    reminder: Notice;
    /** The acknowledgement's button to the other roles. */
    openRoles: string;
};
/** An employer's own wording over the house's, letter by letter, line by line. */
export type LetterWordsPatch = {
    [K in keyof LetterWords]?: LetterWords[K] extends string ? string : Partial<LetterWords[K]>;
};
/** The words with an employer's patch laid over them. */
export declare function patchWords(words: LetterWords, patch: LetterWordsPatch | undefined): LetterWords;
export declare const LETTER_WORDS: Record<Locale, LetterWords>;
export {};
