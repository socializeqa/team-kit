import { afterEach, describe, expect, it, vi } from "vitest";
import { HUB_URL, notify, SCOPE_KEY } from "./notify.js";

afterEach(() => vi.unstubAllGlobals());

describe("notify", () => {
  it("posts the event to HQ with the app's key and reads the answer", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, sent: 2, missing: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await notify({ key: "szn_abc" }, { to: "both", key: "booking.new", title: "New booking" });
    expect(result).toEqual({ ok: true, sent: 2, missing: [] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(HUB_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer szn_abc");
    expect(JSON.parse(String(init.body))).toEqual({ to: "both", key: "booking.new", title: "New booking" });
  });

  it("carries the stream and the buttons to HQ as they are, and answers in the same shape", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, sent: 1, missing: [], dropped: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const event = {
      to: "client" as const,
      key: "booking.new",
      stream: "ops" as const,
      title: "New booking",
      buttons: [
        { label: "Confirm", action: "booking.confirm", payload: { booking: "123" }, style: "go" as const },
        { label: "Decline", action: "booking.decline", payload: { booking: "123" }, style: "stop" as const },
      ],
    };
    expect(await notify({ key: "szn_abc" }, event)).toEqual({ ok: true, sent: 1, missing: [] });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(event);
  });

  it("carries a branch's scope to HQ as it is, beside the rest of the event", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, sent: 3, missing: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const event = { to: "both" as const, key: "booking.new", scope: "al-sadd", title: "New booking", subtitle: "Sam, 6 guests" };
    expect(await notify({ key: "szn_abc" }, event)).toEqual({ ok: true, sent: 3, missing: [] });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(event);
  });

  it("knows a branch key the way HQ reads it", () => {
    for (const key of ["al-sadd", "west-bay", "doha2", "a"]) expect(SCOPE_KEY.test(key)).toBe(true);
    for (const key of ["Al Sadd", "al_sadd", "", "x".repeat(41), "west bay"]) expect(SCOPE_KEY.test(key)).toBe(false);
  });

  it("says why when HQ refuses, and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "unknown key" }), { status: 401 })));
    expect(await notify({ key: "bad" }, { key: "a", title: "t" })).toEqual({ ok: false, error: "unknown key" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await notify({ key: "k" }, { key: "a", title: "t" })).toEqual({ ok: false, error: "network down" });
    expect(await notify({ key: "" }, { key: "a", title: "t" })).toEqual({ ok: false, error: "No hub key." });
  });
});
