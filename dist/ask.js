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
/**
 * Reads a question HQ posted to the app, or null when it is not one HQ
 * signed just now. Pass the body exactly as it arrived (`await
 * request.text()`): the signature is an HMAC-SHA256 of those bytes with the
 * callback secret, in `x-socialize-signature: sha256=<hex>`, and the
 * question must be younger than `maxAgeSeconds` by `x-socialize-timestamp`
 * and by its own signed `at`.
 */
export function verifyAsk(rawBody, headers, secret, { maxAgeSeconds = 300 } = {}) {
    const ask = readSigned(rawBody, headers, secret, maxAgeSeconds);
    if (!ask ||
        typeof ask.id !== "string" ||
        typeof ask.question !== "string" ||
        !ask.payload ||
        typeof ask.payload !== "object" ||
        Array.isArray(ask.payload) ||
        !fresh(ask.at, maxAgeSeconds)) {
        return null;
    }
    return ask;
}
// ---- The questions HQ asks --------------------------------------------------
/**
 * "report.bookings", payload `{ month: "2026-09" }`: the bookings made in
 * that month and the month before, as `{ rows: BookingRow[] }`. The month
 * a booking was made in, Doha time, not the night it is for: the report
 * asks what the month's marketing brought.
 */
export const BOOKINGS_QUESTION = "report.bookings";
/** "2026-09", or null: the month a bookings question names. */
export function askedMonth(payload) {
    const month = payload.month;
    return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}
