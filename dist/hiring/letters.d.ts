/**
 * The six letters a candidate can receive, each built in one place so the
 * panel's preview and the email that goes can never tell two stories. Written
 * in the candidate's language, in the employer's name.
 *
 * A letter comes back as structured plain text, never HTML: the app pours it
 * into its own email shell and escapes it there. Every value here, a typed
 * brief or a candidate's name included, is raw text.
 */
import { type LetterWordsPatch } from "./letter-words.js";
import { type Locale, type OtherLocale } from "./locale.js";
import type { Stage } from "./stages.js";
/**
 * The letters, and the stage each belongs to. A stage with no letter
 * (shortlist, interview) is the office's move, not the candidate's.
 * `received` is the one the form sends by itself the moment they apply.
 */
export declare const LETTERS: readonly ["received", "invited", "trial", "offer", "hired", "rejected"];
export type Letter = (typeof LETTERS)[number];
export type StageLetter = Exclude<Letter, "received">;
export declare function isLetter(value: unknown): value is Letter;
export declare const LETTER_FOR_STAGE: Partial<Record<Stage, StageLetter>>;
/** What a letter may need beyond the candidate and the role. */
export type LetterDetails = {
    /** Interview and first day: when, written out. */
    when?: string;
    /** The interview's day ("2026-10-05") and time ("11:00") on the office's clock; `when` is written from them in the candidate's language. */
    day?: string;
    time?: string;
    where?: string;
    withWhom?: string;
    bring?: string;
    /** How long the interview runs, in minutes ("45"); the letter says it in the candidate's language. */
    minutes?: string;
    /** Trial task: the brief and its deadline. */
    brief?: string;
    deadline?: string;
    /** A line about pay for the trial, as the office typed it ("This task is paid: QAR 300"). */
    paid?: string;
    /** Offer: start, salary, probation, how long it stands. */
    start?: string;
    salary?: string;
    probation?: string;
    validUntil?: string;
    /** First day: who to ask for at the door. */
    askFor?: string;
    /** Regret: a line of the office's own. */
    note?: string;
    /** Regret: "yes" when they came in to meet the office, which the letter thanks them for. */
    interviewed?: string;
};
/**
 * What a letter cannot go without. An invitation with no when or where is
 * not an invitation; the send stays shut until these are filled.
 */
export declare function letterNeeds(letter: Letter, d: LetterDetails): string[];
export declare function letterLabel(letter: Letter): string;
/** The employer a letter speaks for. */
export type LetterBrand = {
    name: string;
    /** The name in Arabic letters, for Arabic letters; `name` when absent. */
    nameAr?: string;
    /** The careers page in a language: the acknowledgement's button. */
    careersUrl: (locale: Locale) => string;
    /**
     * What to bring on the first day, as it reads after "Bring", possessive
     * included ("your Qatar ID", "بطاقتك الشخصية القطرية"). A language without
     * one asks only for what the office lists.
     */
    idDocument?: {
        en: string;
        ar: string;
    } & Partial<Record<OtherLocale, string>>;
    /** How long applications are kept, in months: the regret promises it. Match the erase timing. */
    keepMonths?: number;
    /** How long the office takes to answer, in days: the acknowledgement promises it. */
    replyDays?: number;
    /** How long an offer stands without a date of its own, in days. */
    offerDays?: number;
    /** The office's clock, for an interview picked as a day and a time. */
    timeZone?: string;
    /**
     * The employer's own wording over the house's, by language: a careers site
     * that answers on WhatsApp says so in its acknowledgement. Line by line;
     * whatever it leaves out stays the house's.
     */
    words?: Partial<Record<Locale, LetterWordsPatch>>;
};
export type LetterInput = {
    /** The candidate's full name; letters greet the first word of it. */
    name: string;
    /** The role's title in the letter's language (roleIn). */
    role: string;
    /** The English title, for the English story line; `role` when absent. */
    roleEn?: string;
    withPortfolio?: boolean;
    /** The day the application landed, written out in the letter's language. */
    receivedOn?: string;
    details?: LetterDetails;
};
export type LetterFact = {
    label: string;
    value: string;
    strong?: boolean;
};
export type BuiltLetter = {
    locale: Locale;
    dir: "ltr" | "rtl";
    subject: string;
    /** The inbox's preview line: the first paragraph, cut to 120 letters. */
    preheader: string;
    /** The small line over the title. */
    eyebrow: string;
    title: string;
    paragraphs: string[];
    facts: LetterFact[];
    action?: {
        label: string;
        url: string;
    };
    closing: string;
    /** An English line for the candidate's story: what was sent. */
    summary: string;
};
/** The letter in a language, from its words: the same facts and conditions in each. */
export declare function buildLetter(letter: Letter, input: LetterInput, locale: Locale, brand: LetterBrand): BuiltLetter;
/**
 * The notices about an interview already booked: it moved, it is off, or it
 * is tomorrow. They belong to no stage; the office's move or its clock sends
 * them, each with the calendar file that keeps the candidate's own calendar
 * in step (interviewAttachment, with the same uid and one more sequence).
 */
export declare const INTERVIEW_NOTICES: readonly ["moved", "cancelled", "reminder"];
export type InterviewNotice = (typeof INTERVIEW_NOTICES)[number];
export declare function isInterviewNotice(value: unknown): value is InterviewNotice;
export declare function noticeLabel(notice: InterviewNotice): string;
export type NoticeInput = {
    name: string;
    /** The role's title in the notice's language. */
    role: string;
    /** The English title, for the story line; `role` when absent. */
    roleEn?: string;
    /** The interview's start as an ISO moment: the new one for a move, the one it was for a cancel. */
    startsAt: string;
    minutes?: number;
    where?: string;
    withWhom?: string;
    /** A line of the office's own, after the words. */
    note?: string;
};
/** A notice in the candidate's language; null when `startsAt` is not a moment. */
export declare function buildInterviewNotice(notice: InterviewNotice, input: NoticeInput, locale: Locale, brand: LetterBrand): BuiltLetter | null;
/**
 * The letter's idempotency key for Resend: its own words make it, so pressing
 * Send twice mails it once, and a corrected letter is a new one. `body` is
 * what goes (the rendered HTML). Web Crypto, so it runs anywhere.
 */
export declare function letterKey(letter: Letter | InterviewNotice, id: string, subject: string, body: string): Promise<string>;
/** A story line's letter, without the address: "Interview invitation, emailed to sam@example.com" → "Interview invitation". */
export declare function letterName(detail: string | null): string;
