import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askedMonth, verifyAsk } from "./ask.js";

const SECRET = `szc_${"cd".repeat(32)}`;
const NOW = Date.parse("2026-10-04T21:05:00Z");

/** A question signed the way HQ signs it (web/src/lib/app-ask.ts). */
function signed(body: Record<string, unknown>, { secret = SECRET, at = NOW } = {}) {
  const raw = JSON.stringify(body);
  const headers = new Headers({
    "content-type": "application/json",
    "x-socialize-signature": `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`,
    "x-socialize-timestamp": String(Math.floor(at / 1000)),
  });
  return { raw, headers };
}

const ASK = {
  id: "8f9b2c1e-1d2a-4f6b-9c0d-3e4f5a6b7c8d",
  question: "report.bookings",
  payload: { month: "2026-09" },
  at: new Date(NOW).toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW + 5_000);
});
afterEach(() => vi.useRealTimers());

describe("verifyAsk", () => {
  it("reads a question HQ signed just now", () => {
    const { raw, headers } = signed(ASK);
    expect(verifyAsk(raw, headers, SECRET)).toEqual(ASK);
  });

  it("refuses another secret, a changed body, or no signature", () => {
    const other = signed(ASK, { secret: "someone-else" });
    expect(verifyAsk(other.raw, other.headers, SECRET)).toBeNull();
    const { headers } = signed(ASK);
    expect(verifyAsk(JSON.stringify({ ...ASK, payload: { month: "2026-08" } }), headers, SECRET)).toBeNull();
    expect(verifyAsk(JSON.stringify(ASK), new Headers(), SECRET)).toBeNull();
    expect(verifyAsk(JSON.stringify(ASK), headers, "")).toBeNull();
  });

  it("refuses an old question replayed later, by its stamp or its own time", () => {
    vi.setSystemTime(NOW + 301_000);
    const { raw, headers } = signed(ASK);
    expect(verifyAsk(raw, headers, SECRET)).toBeNull();
    vi.setSystemTime(NOW + 5_000);
    const restamped = signed(ASK, { at: NOW + 5_000 });
    expect(verifyAsk(restamped.raw, restamped.headers, SECRET, { maxAgeSeconds: 2 })).toBeNull();
  });

  it("refuses a body that is not a question", () => {
    const { raw, headers } = signed({ ...ASK, payload: ["2026-09"] });
    expect(verifyAsk(raw, headers, SECRET)).toBeNull();
    const press = signed({ id: "x", action: "booking.confirm", payload: {}, at: ASK.at });
    expect(verifyAsk(press.raw, press.headers, SECRET)).toBeNull();
  });
});

describe("askedMonth", () => {
  it("takes a real month and nothing else", () => {
    expect(askedMonth({ month: "2026-09" })).toBe("2026-09");
    expect(askedMonth({ month: "2026-13" })).toBeNull();
    expect(askedMonth({ month: "2026-9" })).toBeNull();
    expect(askedMonth({ month: 202609 })).toBeNull();
    expect(askedMonth({})).toBeNull();
  });
});
