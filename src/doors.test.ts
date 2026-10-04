import { afterEach, describe, expect, it, vi } from "vitest";
import { fateOf, isTrouble, MAIL_URL, readFates } from "./mail.js";
import { MAX_URLS, pingGoogle, SEARCH_URL } from "./search.js";

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("fateOf", () => {
  it("names the most telling event, not the newest", () => {
    expect(
      fateOf([
        { event: "sent", at: "2026-10-04T08:00:00Z", why: null },
        { event: "delivered", at: "2026-10-04T08:00:05Z", why: null },
        { event: "complained", at: "2026-10-04T09:00:00Z", why: null },
      ]),
    ).toEqual({ fate: "complained", at: "2026-10-04T09:00:00Z", why: null });
    expect(
      fateOf([
        { event: "delivery_delayed", at: "2026-10-04T08:01:00Z", why: null },
        { event: "delivered", at: "2026-10-04T08:20:00Z", why: null },
      ])?.fate,
    ).toBe("delivered");
  });

  it("keeps the receiving server's words on a bounce", () => {
    expect(fateOf([{ event: "bounced", at: "2026-10-04T08:00:00Z", why: "550 no such user" }])).toEqual({
      fate: "bounced",
      at: "2026-10-04T08:00:00Z",
      why: "550 no such user",
    });
  });

  it("says nothing before Resend has", () => {
    expect(fateOf([])).toBeNull();
    expect(fateOf([{ event: "opened", at: "2026-10-04T08:00:00Z", why: null }])).toBeNull();
  });

  it("calls a person to act only when the letter reached no one who wants it", () => {
    expect(["bounced", "complained", "failed", "suppressed"].every((fate) => isTrouble(fate as never))).toBe(true);
    expect(isTrouble("delivered")).toBe(false);
    expect(isTrouble("delivery_delayed")).toBe(false);
  });
});

describe("readFates", () => {
  it("asks HQ with the hub key and hands back one fate per letter", async () => {
    const fetch = vi.fn(async () =>
      json({
        ok: true,
        events: [
          { id: "a", event: "sent", at: "2026-10-04T08:00:00Z", why: null },
          { id: "a", event: "bounced", at: "2026-10-04T08:00:03Z", why: "mailbox full" },
          { id: "b", event: "delivered", at: "2026-10-04T08:00:04Z", why: null },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const out = await readFates({ key: "szn_k" }, ["a", "b", "a", "c", ""]);
    expect(out).toEqual({
      ok: true,
      fates: {
        a: { fate: "bounced", at: "2026-10-04T08:00:03Z", why: "mailbox full" },
        b: { fate: "delivered", at: "2026-10-04T08:00:04Z", why: null },
      },
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(MAIL_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer szn_k");
    expect(JSON.parse(String(init.body))).toEqual({ ids: ["a", "b", "c"] });
  });

  it("asks nothing for no ids, refuses too many, and never throws", async () => {
    const fetch = vi.fn(async () => json({ ok: true, events: [] }));
    vi.stubGlobal("fetch", fetch);
    expect(await readFates({ key: "k" }, [])).toEqual({ ok: true, fates: {} });
    expect(fetch).not.toHaveBeenCalled();
    expect((await readFates({ key: "k" }, Array.from({ length: 101 }, (_, i) => `id${i}`))).ok).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "unknown key" }, 401)));
    expect(await readFates({ key: "bad" }, ["a"])).toEqual({ ok: false, error: "unknown key" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await readFates({ key: "k" }, ["a"])).toEqual({ ok: false, error: "offline" });
    expect(await readFates({ key: "" }, ["a"])).toEqual({ ok: false, error: "No hub key." });
  });
});

describe("pingGoogle", () => {
  it("sends each address once, and says whether the page is gone", async () => {
    const fetch = vi.fn(async () => json({ ok: true, pinged: [{ url: "https://a.qa/en/x", ok: true }] }));
    vi.stubGlobal("fetch", fetch);
    const out = await pingGoogle({ key: "k" }, { urls: ["https://a.qa/en/x", "https://a.qa/en/x"], gone: true });
    expect(out).toEqual({ ok: true, pinged: [{ url: "https://a.qa/en/x", ok: true }] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(SEARCH_URL);
    expect(JSON.parse(String(init.body))).toEqual({ urls: ["https://a.qa/en/x"], gone: true });
  });

  it("asks nothing for nothing, refuses a sweep, and passes HQ's refusal on", async () => {
    const fetch = vi.fn(async () => json({ ok: false, error: "Not on example.qa: https://evil.test/" }, 400));
    vi.stubGlobal("fetch", fetch);
    expect(await pingGoogle({ key: "k" }, { urls: [] })).toEqual({ ok: true, pinged: [] });
    expect(fetch).not.toHaveBeenCalled();
    const many = Array.from({ length: MAX_URLS + 1 }, (_, i) => `https://a.qa/${i}`);
    expect((await pingGoogle({ key: "k" }, { urls: many })).ok).toBe(false);
    expect(await pingGoogle({ key: "k" }, { urls: ["https://evil.test/"] })).toEqual({
      ok: false,
      error: "Not on example.qa: https://evil.test/",
    });
  });
});
