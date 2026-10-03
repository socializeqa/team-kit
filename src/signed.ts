/**
 * The seal on everything HQ posts to an app's callback host: a press on a
 * button (`press`) or a question (`ask`). Both are signed the same way, with
 * the callback secret made in HQ → Settings → Telegram → Projects.
 *
 * Server only: it signs with Node's crypto.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE = /^sha256=([0-9a-f]{64})$/;

/**
 * The parsed body when HQ signed these exact bytes with `secret` within
 * `maxAgeSeconds`, by `x-socialize-timestamp`; otherwise null. The caller
 * checks the body's own shape and its signed `at`.
 */
export function readSigned(rawBody: string, headers: Headers, secret: string, maxAgeSeconds: number): unknown {
  if (!secret || typeof rawBody !== "string") return null;
  const match = SIGNATURE.exec((headers.get("x-socialize-signature") ?? "").trim());
  if (!match?.[1]) return null;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(match[1], "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const stamp = Number(headers.get("x-socialize-timestamp"));
  if (!Number.isFinite(stamp) || Math.abs(Date.now() / 1000 - stamp) > maxAgeSeconds) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

/** A signed `at` no older or newer than `maxAgeSeconds`. */
export function fresh(at: unknown, maxAgeSeconds: number): boolean {
  if (typeof at !== "string") return false;
  const when = Date.parse(at);
  return Number.isFinite(when) && Math.abs(Date.now() - when) <= maxAgeSeconds * 1000;
}
