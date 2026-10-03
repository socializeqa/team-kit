/**
 * The seal on everything HQ posts to an app's callback host: a press on a
 * button (`press`) or a question (`ask`). Both are signed the same way, with
 * the callback secret made in HQ → Settings → Telegram → Projects.
 *
 * Server only: it signs with Node's crypto.
 */
/**
 * The parsed body when HQ signed these exact bytes with `secret` within
 * `maxAgeSeconds`, by `x-socialize-timestamp`; otherwise null. The caller
 * checks the body's own shape and its signed `at`.
 */
export declare function readSigned(rawBody: string, headers: Headers, secret: string, maxAgeSeconds: number): unknown;
/** A signed `at` no older or newer than `maxAgeSeconds`. */
export declare function fresh(at: unknown, maxAgeSeconds: number): boolean;
