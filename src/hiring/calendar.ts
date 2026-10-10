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
export function interviewIcs(event: InterviewEvent): string | null {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (event.minutes ?? 45) * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${event.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escape(event.uid)}`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
