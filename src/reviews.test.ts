import { afterEach, describe, expect, it, vi } from "vitest";
import { averageStars, dohaMonth, isOpen, monthlyScores, pressReview, readReviews, replyBytes, REVIEWS_URL } from "./reviews.js";

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("readReviews", () => {
  it("reads the client's reviews with the hub key", async () => {
    const fetch = vi.fn(async () => json({ ok: true, places: [{ label: "West Bay", signOff: "Team", pulledAt: null }], reviews: [] }));
    vi.stubGlobal("fetch", fetch);
    const out = await readReviews({ key: "szn_k" });
    expect(out).toEqual({ ok: true, places: [{ label: "West Bay", signOff: "Team", pulledAt: null }], reviews: [] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(REVIEWS_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer szn_k");
  });

  it("says why when HQ refuses, and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "unknown key" }, 401)));
    expect(await readReviews({ key: "bad" })).toEqual({ ok: false, error: "unknown key" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gateway", { status: 502 })));
    expect(await readReviews({ key: "k" })).toEqual({ ok: false, error: "HQ answered 502." });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await readReviews({ key: "k" })).toEqual({ ok: false, error: "offline" });
    expect(await readReviews({ key: "" })).toEqual({ ok: false, error: "No hub key." });
  });
});

describe("pressReview", () => {
  it("sends the press as JSON, named by who made it", async () => {
    const fetch = vi.fn(async () => json({ ok: true, reviews: [], posted: 1, waiting: 0, failed: [] }));
    vi.stubGlobal("fetch", fetch);
    const out = await pressReview({ key: "k", url: "http://hq.test/api/reviews" }, { action: "post", ids: ["a"], by: "Dina" });
    expect(out).toMatchObject({ ok: true, posted: 1 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://hq.test/api/reviews");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ action: "post", ids: ["a"], by: "Dina" });
  });

  it("keeps the review as it stands when the press is refused", async () => {
    const standing = { id: "a", status: "posted" };
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "This review was answered meanwhile.", reviews: [standing] }, 409)));
    expect(await pressReview({ key: "k" }, { action: "skip", id: "a", by: "Dina" })).toEqual({
      ok: false,
      error: "This review was answered meanwhile.",
      reviews: [standing],
    });
  });
});

describe("reading them", () => {
  it("knows which still wait for an answer", () => {
    expect(["new", "draft", "approved"].every((status) => isOpen({ status: status as "new" }))).toBe(true);
    expect(["posted", "skipped", "answered"].some((status) => isOpen({ status: status as "posted" }))).toBe(false);
  });

  it("counts a reply in bytes, as Google does", () => {
    expect(replyBytes("abc")).toBe(3);
    expect(replyBytes("شكرا")).toBe(8);
  });

  it("averages to one decimal, and says nothing about nothing", () => {
    expect(averageStars([{ stars: 5 }, { stars: 4 }, { stars: 4 }])).toBe(4.3);
    expect(averageStars([])).toBeNull();
  });

  it("puts a review in Doha's month, not London's", () => {
    expect(dohaMonth("2026-09-30T22:30:00Z")).toBe("2026-10");
    expect(dohaMonth("2026-09-30T20:30:00Z")).toBe("2026-09");
  });

  it("lays the months out oldest first, quiet ones included", () => {
    const scores = monthlyScores(
      [
        { stars: 5, reviewedAt: "2026-09-02T10:00:00Z" },
        { stars: 3, reviewedAt: "2026-09-20T10:00:00Z" },
        { stars: 1, reviewedAt: "2026-07-01T10:00:00Z" },
        { stars: 5, reviewedAt: "2025-01-01T10:00:00Z" },
      ],
      3,
      new Date("2026-09-30T12:00:00Z"),
    );
    expect(scores).toEqual([
      { month: "2026-07", count: 1, average: 1 },
      { month: "2026-08", count: 0, average: null },
      { month: "2026-09", count: 2, average: 4 },
    ]);
  });

  it("crosses a year's end", () => {
    const scores = monthlyScores([], 3, new Date("2027-01-15T12:00:00Z"));
    expect(scores.map((score) => score.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
