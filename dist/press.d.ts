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
/** A press on one of the app's buttons, as HQ posts it to the app's callback. */
export interface Press {
    /** The button's own id: a press is sent once, so a second sight of an id is a replay. */
    id: string;
    action: string;
    payload: Record<string, unknown>;
    /** Who pressed, as Telegram names them. Anyone in the room may press. */
    by: {
        telegram_id: number;
        name: string;
    };
    /** When HQ sent it, ISO 8601; signed with the rest. */
    at: string;
}
/**
 * What the callback answers, as JSON. `ok: true` settles the message: its
 * buttons go and "✅ <text> — Sam, 14:05" is written under it. `ok: false`
 * keeps the buttons and shows `text` to the presser (say why). Answer within
 * eight seconds.
 */
export interface PressAnswer {
    ok: boolean;
    /** A few words for the presser and the message, up to 180 letters. */
    text?: string;
}
/**
 * Reads a press HQ posted to the app's callback, or null when it is not one
 * HQ signed just now. Pass the body exactly as it arrived (`await
 * request.text()`, before any JSON parsing): the signature is an
 * HMAC-SHA256 of those bytes with the app's callback secret, in
 * `x-socialize-signature: sha256=<hex>`. The press must be younger than
 * `maxAgeSeconds`, both by `x-socialize-timestamp` and by its own signed
 * `at`, so an old press replayed later is refused.
 */
export declare function verifyPress(rawBody: string, headers: Headers, secret: string, { maxAgeSeconds }?: {
    maxAgeSeconds?: number;
}): Press | null;
