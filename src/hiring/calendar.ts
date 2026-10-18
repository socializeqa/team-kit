/**
 * An interview, said and filed: the day and time the office picked, in the
 * candidate's own words, and the same moment as a calendar file (.ics) a
 * phone or Outlook adds in one tap. The office picks a day and a time on its
 * own clock; the calendar file carries it in UTC, so it lands right wherever
 * the candidate's phone is.
 */

import { DATE_TAGS, DEFAULT_TIME_ZONE, type Locale } from "./locale.js";

/** How far a zone's clock is ahead of UTC at a moment, in milliseconds. */
function offsetAt(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * A day ("2026-10-05") and a time ("11:00") on a zone's clock, as one moment;
 * null when either is not one (a 30 February included) or the zone is unknown.
 */
export function momentIn(day: string | undefined, time: string | undefined, timeZone: string = DEFAULT_TIME_ZONE): Date | null {
  if (!day || !time || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const wall = Date.parse(`${day}T${time}:00Z`);
  // Date.parse rolls 30 February into March; a day that does not exist is refused.
  if (Number.isNaN(wall) || new Date(wall).toISOString().slice(0, 16) !== `${day}T${time}`) return null;
  try {
    // Twice, so a moment beside a daylight-saving change settles on the right side of it.
    const first = wall - offsetAt(wall, timeZone);
    return new Date(wall - offsetAt(first, timeZone));
  } catch {
    return null;
  }
}

/** The moment as the reader says it: "Monday 5 October 2026 at 11:00" in English, and so on. */
export function sayMoment(at: Date, locale: Locale, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(DATE_TAGS[locale], { dateStyle: "full", timeStyle: "short", timeZone }).format(at);
}

/** How long an interview runs, the way the reader says it: "45 minutes", "٤٥ دقيقة"; null for anything but a sane whole number. */
export function sayLength(minutes: unknown, locale: Locale): string | null {
  const n = typeof minutes === "string" ? Number(minutes) : minutes;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 5 || n > 480) return null;
  return new Intl.NumberFormat(DATE_TAGS[locale], { style: "unit", unit: "minute", unitDisplay: "long" }).format(n);
}

/** Text in a calendar line: backslashes, semicolons, commas and line breaks escaped (RFC 5545 3.3.11). */
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

/** A long line folded at 75 octets, the rest on lines that start with a space (RFC 5545 3.1); never inside a letter. */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let part = "";
  for (const char of line) {
    const limit = parts.length ? 74 : 75;
    if (encoder.encode(part + char).length > limit) {
      parts.push(part);
      part = char;
    } else part += char;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

const stamp = (at: Date) => at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Someone on a calendar file: their address, and the name a calendar shows. */
export type CalendarParty = { email: string; name?: string };

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
export function icsMethod(event: Pick<InterviewEvent, "organizer" | "attendee" | "cancelled">): "PUBLISH" | "REQUEST" | "CANCEL" {
  if (event.cancelled && event.organizer) return "CANCEL";
  return event.organizer && event.attendee ? "REQUEST" : "PUBLISH";
}

// A name inside a parameter is a quoted string: no quote marks or control characters in it (RFC 5545 3.2).
const quoted = (name: string | undefined) => `"${(name ?? "").replace(/["\u0000-\u001f\u007f]/g, "").trim()}"`;
// An address is a mailto: URI, never escaped like text; anything that is not an address is left out.
const mailto = (party: CalendarParty | undefined) => (party && /^[^\s@<>"]+@[^\s@<>"]+$/.test(party.email.trim()) ? `mailto:${party.email.trim()}` : null);
const party = (key: string, who: CalendarParty, extra = "") => `${key}${who.name?.trim() ? `;CN=${quoted(who.name)}` : ""}${extra}:${mailto(who)}`;

/**
 * The interview as a calendar file, in UTC with CRLF lines; null when
 * `startsAt` is not a moment. With an organizer and the candidate it is an
 * invitation their calendar can accept, and the same uid with a higher
 * sequence moves it (or, `cancelled`, takes it off) where they keep it.
 */
export function interviewIcs(event: InterviewEvent): string | null {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (event.minutes ?? 45) * 60_000);
  const organizer = event.organizer && mailto(event.organizer) ? event.organizer : undefined;
  const attendee = event.attendee && mailto(event.attendee) ? event.attendee : undefined;
  const method = icsMethod({ organizer, attendee, cancelled: event.cancelled });
  const sequence = Math.max(0, Math.floor(event.sequence ?? 0));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${event.prodId}`,
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${escape(event.uid)}`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    // Present whenever it counts: a change, and always on a cancel.
    ...(sequence > 0 || method === "CANCEL" ? [`SEQUENCE:${sequence}`] : []),
    `SUMMARY:${escape(event.title)}`,
    ...(organizer ? [party("ORGANIZER", organizer)] : []),
    // An invitation asks them to answer; a cancel names who it is cancelled for. A published file names nobody.
    ...(attendee && method === "REQUEST" ? [party("ATTENDEE", attendee, ";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE")] : []),
    ...(attendee && method === "CANCEL" ? [party("ATTENDEE", attendee)] : []),
    `STATUS:${method === "CANCEL" || event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * The calendar file as an email attachment: its name, its words in base64,
 * and the content type that names its method, which is how a mail app knows
 * an invitation from a plain file.
 */
export function interviewAttachment(event: InterviewEvent): { filename: string; content: string; contentType: string } | null {
  const file = interviewIcs(event);
  if (!file) return null;
  const method = icsMethod({ organizer: event.organizer && mailto(event.organizer) ? event.organizer : undefined, attendee: event.attendee && mailto(event.attendee) ? event.attendee : undefined, cancelled: event.cancelled });
  const bytes = new TextEncoder().encode(file);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    filename: method === "CANCEL" ? "cancel.ics" : "invite.ics",
    content: btoa(binary),
    contentType: `text/calendar; charset=UTF-8; method=${method}`,
  };
}
