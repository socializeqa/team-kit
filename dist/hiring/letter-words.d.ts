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
    /** The acknowledgement's button to the other roles. */
    openRoles: string;
};
export declare const LETTER_WORDS: Record<Locale, LetterWords>;
export {};
