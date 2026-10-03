/**
 * A press on one of the app's Telegram buttons, as HQ relays it.
 *
 * An event sent with `notify` may carry buttons. When someone in the room
 * presses one, HQ posts the press to the app's callback (HQ → Settings →
 * Telegram → Projects), signed with the callback secret made there, and
 * shows the app's answer under the message. The callback reads the press
 * with `verifyPress` and answers a `PressAnswer`.
 *
 * Server only: it signs with Node's crypto.
 */
import { fresh, readSigned } from "./signed.js";
/**
 * Reads a press HQ posted to the app's callback, or null when it is not one
 * HQ signed just now. Pass the body exactly as it arrived (`await
 * request.text()`, before any JSON parsing): the signature is an
 * HMAC-SHA256 of those bytes with the app's callback secret, in
 * `x-socialize-signature: sha256=<hex>`. The press must be younger than
 * `maxAgeSeconds`, both by `x-socialize-timestamp` and by its own signed
 * `at`, so an old press replayed later is refused.
 */
export function verifyPress(rawBody, headers, secret, { maxAgeSeconds = 300 } = {}) {
    const press = readSigned(rawBody, headers, secret, maxAgeSeconds);
    if (!press ||
        typeof press.id !== "string" ||
        typeof press.action !== "string" ||
        !press.payload ||
        typeof press.payload !== "object" ||
        Array.isArray(press.payload) ||
        typeof press.by?.telegram_id !== "number" ||
        typeof press.by?.name !== "string" ||
        !fresh(press.at, maxAgeSeconds)) {
        return null;
    }
    return press;
}
