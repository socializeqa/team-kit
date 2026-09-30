import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPress } from "./press.js";

const SECRET = `szc_${"ab".repeat(32)}`;
const NOW = Date.parse("2026-09-30T12:00:00Z");

/** A press signed the way HQ signs it (web/src/lib/telegram/hub-press.ts). */
function signed(body: Record<string, unknown>, { secret = SECRET, at = NOW } = {}) {
  const raw = JSON.stringify(body);
  const headers = new Headers({
    "content-type": "application/json",
    "x-socialize-signature": `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`,
    "x-socialize-timestamp": String(Math.floor(at / 1000)),
  });
  return { raw, headers };
}

const PRESS = {
  id: "Ab3_x-9Qz1",
  action: "booking.confirm",
  payload: { booking: "123" },
  by: { telegram_id: 6660001, name: "Sam Haddad" },
  at: new Date(NOW).toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW + 20_000);
});
afterEach(() => vi.useRealTimers());

describe("verifyPress", () => {
  it("reads a press HQ signed just now", () => {
    const { raw, headers } = signed(PRESS);
    expect(verifyPress(raw, headers, SECRET)).toEqual(PRESS);
  });

  it("refuses a press signed with another secret, or not signed at all", () => {
    const { raw, headers } = signed(PRESS, { secret: "someone-else" });
    expect(verifyPress(raw, headers, SECRET)).toBeNull();
    expect(verifyPress(raw, new Headers(), SECRET)).toBeNull();
    expect(verifyPress(raw, signed(PRESS).headers, "")).toBeNull();
  });

  it("refuses a body changed after it was signed", () => {
    const { headers } = signed(PRESS);
    const changed = JSON.stringify({ ...PRESS, payload: { booking: "999" } });
    expect(verifyPress(changed, headers, SECRET)).toBeNull();
  });

  it("refuses an old press replayed later, by its header and by its signed time", () => {
    const { raw, headers } = signed(PRESS);
    vi.setSystemTime(NOW + 301_000);
    expect(verifyPress(raw, headers, SECRET)).toBeNull();
    expect(verifyPress(raw, headers, SECRET, { maxAgeSeconds: 600 })).toEqual(PRESS);

    // A fresh header does not make an old body new: `at` is signed with it.
    vi.setSystemTime(NOW + 20_000);
    const old = signed({ ...PRESS, at: new Date(NOW - 3_600_000).toISOString() });
    expect(verifyPress(old.raw, old.headers, SECRET)).toBeNull();
  });

  it("refuses a signed body that is not a press", () => {
    const { raw, headers } = signed({ id: "x", action: "a" });
    expect(verifyPress(raw, headers, SECRET)).toBeNull();
    const list = signed({ ...PRESS, payload: [1, 2] });
    expect(verifyPress(list.raw, list.headers, SECRET)).toBeNull();
  });
});
