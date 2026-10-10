/**
 * An interview, said and filed: the day and time the office picked, in the
 * candidate's own words, and the same moment as a calendar file (.ics) a
 * phone or Outlook adds in one tap. The office picks a day and a time on its
 * own clock; the calendar file carries it in UTC, so it lands right wherever
 * the candidate's phone is.
 */
import { type Locale } from "./locale.js";
/**
 * A day ("2026-10-05") and a time ("11:00") on a zone's clock, as one moment;
 * null when either is not one (a 30 February included) or the zone is unknown.
 */
export declare function momentIn(day: string | undefined, time: string | undefined, timeZone?: string): Date | null;
/** The moment as the reader says it: "Monday 5 October 2026 at 11:00" in English, and so on. */
export declare function sayMoment(at: Date, locale: Locale, timeZone?: string): string;
export type InterviewEvent = {
    /** Unique and stable for this interview, so a re-sent invite updates the same event: "interview-<id>-<time>@example.com". */
    uid: string;
    title: string;
    /** The start as an ISO moment (momentIn(...).toISOString()). */
    startsAt: string;
    minutes?: number;
    location?: string;
    description?: string;
    /** Who made the file: "-//Example Co//Hiring//EN". */
    prodId: string;
    /** When the file was made; now unless a test pins it. */
    now?: Date;
};
/** The interview as a calendar file, in UTC with CRLF lines; null when `startsAt` is not a moment. */
export declare function interviewIcs(event: InterviewEvent): string | null;
