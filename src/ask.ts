/**
 * A question HQ asks the app, and the app's answer.
 *
 * Some of what HQ shows a client lives only in the client's own app: the
 * bookings a restaurant took, the requests a maintenance company logged.
 * HQ does not keep a copy. When it needs the numbers (the monthly report,
 * prepared on the 5th), it asks the app, and the app answers from its own
 * records.
 *
 * HQ posts the question to `ASK_PATH` on the host of the app's callback
 * (HQ → Settings → Telegram → Projects), signed with the same callback
 * secret a button press carries. The route reads it with `verifyAsk` and
 * answers an `AskAnswer` as JSON within twenty seconds. An app answers only
 * the questions it knows; anything else is `{ ok: false, error }`.
 *
 * Server only: it signs with Node's crypto.
 */

import { fresh, readSigned } from "./signed.js";

/** Where the app takes questions, on its callback's own host. */
export const ASK_PATH = "/api/hub/ask";

/** A question HQ posted to the app. */
export interface Ask {
  /** A fresh id for each question; nothing to keep. */
  id: string;
  question: string;
  payload: Record<string, unknown>;
  /** When HQ sent it, ISO 8601; signed with the rest. */
  at: string;
}

/** What the app answers, as JSON. */
export type AskAnswer<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Reads a question HQ posted to the app, or null when it is not one HQ
 * signed just now. Pass the body exactly as it arrived (`await
 * request.text()`): the signature is an HMAC-SHA256 of those bytes with the
 * callback secret, in `x-socialize-signature: sha256=<hex>`, and the
 * question must be younger than `maxAgeSeconds` by `x-socialize-timestamp`
 * and by its own signed `at`.
 */
export function verifyAsk(
  rawBody: string,
  headers: Headers,
  secret: string,
  { maxAgeSeconds = 300 }: { maxAgeSeconds?: number } = {},
): Ask | null {
  const ask = readSigned(rawBody, headers, secret, maxAgeSeconds) as Partial<Ask> | null;
  if (
    !ask ||
    typeof ask.id !== "string" ||
    typeof ask.question !== "string" ||
    !ask.payload ||
    typeof ask.payload !== "object" ||
    Array.isArray(ask.payload) ||
    !fresh(ask.at, maxAgeSeconds)
  ) {
    return null;
  }
  return ask as Ask;
}

// ---- The questions HQ asks --------------------------------------------------

/**
 * "report.bookings", payload `{ month: "2026-09" }`: the bookings made in
 * that month and the month before, as `{ rows: BookingRow[] }`. The month
 * a booking was made in, Doha time, not the night it is for: the report
 * asks what the month's marketing brought.
 */
export const BOOKINGS_QUESTION = "report.bookings";

/** One line of the bookings answer: a month, a branch, a door, a campaign tag. */
export interface BookingRow {
  /** "2026-09". */
  month: string;
  /** The branch's slug, and its name as the app writes it. */
  branch: string;
  branchName: string;
  /**
   * The door it came through, in the house's words: meta_paid,
   * google_paid, tiktok_paid, instagram_bio, tiktok_bio, instagram_story,
   * dm_assistant, whatsapp, google_business, google_organic, delivery_app,
   * referral, direct, or the app's own for a booking staff made.
   */
  channel: string;
  /** The door in the words the client's paper prints. */
  label: string;
  /** The campaign tag the booking carried, if any. */
  campaign: string | null;
  bookings: number;
  /** Guests: the party sizes added up. */
  covers: number;
  /** Seated, or confirmed and not marked otherwise. */
  held: number;
  noShows: number;
  cancelled: number;
}

/** "2026-09", or null: the month a bookings question names. */
export function askedMonth(payload: Record<string, unknown>): string | null {
  const month = payload.month;
  return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}
