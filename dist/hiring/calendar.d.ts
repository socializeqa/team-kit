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
/** How long an interview runs, the way the reader says it: "45 minutes", "٤٥ دقيقة"; null for anything but a sane whole number. */
export declare function sayLength(minutes: unknown, locale: Locale): string | null;
/** Someone on a calendar file: their address, and the name a calendar shows. */
export type CalendarParty = {
    email: string;
    name?: string;
};
export type InterviewEvent = {
    /** Unique and stable for this interview, so a re-sent invite updates the same event: "interview-<id>@example.com". */
    uid: string;
    title: string;
    /** The start as an ISO moment (momentIn(...).toISOString()). */
    startsAt: string;
    minutes?: number;
    location?: string;
    description?: string;
    /** Who made the file: "-//Example Co//Hiring//EN". */
    prodId: string;
    /**
     * Who invites: the address the letter comes from. RFC 5546 asks for one on
     * every method; with an `attendee` the file is a real invitation (REQUEST)
     * that the candidate's calendar answers, updates and cancels.
     */
    organizer?: CalendarParty;
    /** The candidate. With an organizer, the file invites them (REQUEST); without, it is published to add (PUBLISH). */
    attendee?: CalendarParty;
    /**
     * How many times this interview was changed after it was first sent: 0 for
     * the invite, then one more for every move. The highest one wins in their
     * calendar (RFC 5546 2.1.5), so a moved invite replaces the old one.
     */
    sequence?: number;
    /** The interview is off: the file cancels it in their calendar (CANCEL). */
    cancelled?: boolean;
    /** When the file was made; now unless a test pins it. */
    now?: Date;
};
/** What a calendar file asks of the calendar that opens it (RFC 5546 1.4). */
export declare function icsMethod(event: Pick<InterviewEvent, "organizer" | "attendee" | "cancelled">): "PUBLISH" | "REQUEST" | "CANCEL";
/**
 * The interview as a calendar file, in UTC with CRLF lines; null when
 * `startsAt` is not a moment. With an organizer and the candidate it is an
 * invitation their calendar can accept, and the same uid with a higher
 * sequence moves it (or, `cancelled`, takes it off) where they keep it.
 */
export declare function interviewIcs(event: InterviewEvent): string | null;
/**
 * The calendar file as an email attachment: its name, its words in base64,
 * and the content type that names its method, which is how a mail app knows
 * an invitation from a plain file.
 */
export declare function interviewAttachment(event: InterviewEvent): {
    filename: string;
    content: string;
    contentType: string;
} | null;
