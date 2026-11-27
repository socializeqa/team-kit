import { afterEach, describe, expect, it, vi } from "vitest";
import { askClaudeViaHq, CLAUDE, HQ_CLAUDE_URL } from "./ai.js";

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const usage = { model: CLAUDE.smart, promptTokens: 1200, completionTokens: 80, costUsd: 0.0064 };
const ask = {
  purpose: "Instagram replies",
  model: CLAUDE.smart,
  system: ["rules", "right now"],
  turns: [{ role: "user" as const, content: "Are you open tonight?" }],
  timeoutMs: 8000,
};

describe("askClaudeViaHq", () => {
  it("asks HQ's Claude door with the hub key and hands back the words and the bill", async () => {
    const fetch = vi.fn(async () => json({ ok: true, text: "Yes, until 2 AM.", answer: null, usage, stopReason: "end_turn" }));
    vi.stubGlobal("fetch", fetch);
    const out = await askClaudeViaHq({ key: "szn_k" }, ask);
    expect(out).toEqual({ ok: true, text: "Yes, until 2 AM.", answer: null, usage, stopReason: "end_turn" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(HQ_CLAUDE_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer szn_k");
    expect(JSON.parse(String(init.body))).toEqual(ask);
  });

  it("passes a schema's parsed answer through", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, text: '{"complaint":true}', answer: { complaint: true }, usage })));
    const out = await askClaudeViaHq<{ complaint: boolean }>({ key: "k" }, { ...ask, schema: { type: "object" } });
    expect(out.ok && out.answer).toEqual({ complaint: true });
    expect(out.ok && out.stopReason).toBe("end_turn");
  });

  it("says why it failed, and whether the wait ran out, and never throws", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "this month's AI cap is reached" }, 402)));
    expect(await askClaudeViaHq({ key: "k", onError }, ask)).toEqual({
      ok: false, error: "this month's AI cap is reached", status: 402, timedOut: false,
    });
    expect(onError).toHaveBeenCalledWith("claude via hq", "this month's AI cap is reached");

    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "Claude took too long." }, 504)));
    expect(await askClaudeViaHq({ key: "k" }, ask)).toMatchObject({ ok: false, timedOut: true });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("The operation was aborted.", "TimeoutError"); }));
    expect(await askClaudeViaHq({ key: "k" }, ask)).toMatchObject({ ok: false, timedOut: true, status: null });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await askClaudeViaHq({ key: "k" }, ask)).toEqual({ ok: false, error: "offline", status: null, timedOut: false });

    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true })));
    expect((await askClaudeViaHq({ key: "k" }, ask)).ok).toBe(false);

    expect(await askClaudeViaHq({ key: "" }, ask)).toEqual({ ok: false, error: "No hub key.", status: null, timedOut: false });
  });
});
