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
import { createHmac, timingSafeEqual } from "node:crypto";
const SIGNATURE = /^sha256=([0-9a-f]{64})$/;
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
    if (!secret || typeof rawBody !== "string")
        return null;
    const match = SIGNATURE.exec((headers.get("x-socialize-signature") ?? "").trim());
    if (!match?.[1])
        return null;
    const expected = createHmac("sha256", secret).update(rawBody).digest();
    const given = Buffer.from(match[1], "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
        return null;
    const now = Date.now();
    const stamp = Number(headers.get("x-socialize-timestamp"));
    if (!Number.isFinite(stamp) || Math.abs(now / 1000 - stamp) > maxAgeSeconds)
        return null;
    let body;
    try {
        body = JSON.parse(rawBody);
    }
    catch {
        return null;
    }
    const press = body;
    if (!press ||
        typeof press.id !== "string" ||
        typeof press.action !== "string" ||
        !press.payload ||
        typeof press.payload !== "object" ||
        Array.isArray(press.payload) ||
        typeof press.by?.telegram_id !== "number" ||
        typeof press.by?.name !== "string" ||
        typeof press.at !== "string") {
        return null;
    }
    const at = Date.parse(press.at);
    if (!Number.isFinite(at) || Math.abs(now - at) > maxAgeSeconds * 1000)
        return null;
    return press;
}
