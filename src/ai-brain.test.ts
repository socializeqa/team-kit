import { afterEach, describe, expect, it, vi } from "vitest";
import { askForJson, MODELS } from "./ai.js";
import { BRAIN_URL, readBrain } from "./brain.js";

afterEach(() => vi.unstubAllGlobals());

const answer = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe("askForJson", () => {
  it("asks with no data kept and a strict schema, and reads the JSON back", async () => {
    const fetch = vi.fn(async () => answer(JSON.stringify({ reply: "Thanks" })));
    vi.stubGlobal("fetch", fetch);
    const out = await askForJson<{ reply: string }>({ key: "k" }, { models: [MODELS.writer], system: "s", prompt: "p", schema: { type: "object" } });
    expect(out).toEqual({ reply: "Thanks" });
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.provider).toMatchObject({ data_collection: "deny", zdr: true, require_parameters: true, ignore: ["google-vertex"] });
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.temperature).toBe(0);
  });

  it("falls to the next model when the first fails, and tells the app why", async () => {
    const heard: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("down", { status: 503 })).mockResolvedValueOnce(answer('{"ok":true}')));
    const out = await askForJson({ key: "k", onError: (where) => heard.push(where) }, { models: ["a/one", "b/two"], system: "s", prompt: "p", schema: {} });
    expect(out).toEqual({ ok: true });
    expect(heard).toEqual(["ai a/one"]);
  });

  it("sends a PDF whole, read natively, and names the model and schema on a failure", async () => {
    const heard: unknown[] = [];
    const fetch = vi.fn(async () => new Response("no", { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const out = await askForJson(
      { key: "k", onError: (_where, _detail, context) => heard.push(context) },
      { models: ["m/one"], system: "s", prompt: "p", schema: {}, schemaName: "cv", files: [{ filename: "cv.pdf", base64: "JVBER" }] },
    );
    expect(out).toBeNull();
    expect(heard).toEqual([{ model: "m/one", schemaName: "cv" }]);
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.plugins).toEqual([{ id: "file-parser", pdf: { engine: "native" } }]);
    expect(body.messages[1].content[1]).toEqual({ type: "file", file: { filename: "cv.pdf", file_data: "data:application/pdf;base64,JVBER" } });
  });

  it("stays silent when switched off or without a key, and never throws", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await askForJson({ key: "k", disabled: true }, { models: ["m"], system: "", prompt: "", schema: {} })).toBeNull();
    expect(await askForJson({ key: "" }, { models: ["m"], system: "", prompt: "", schema: {} })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await askForJson({ key: "k" }, { models: ["m"], system: "", prompt: "", schema: {} })).toBeNull();
  });
});

describe("readBrain", () => {
  it("asks HQ with the app's key for one branch and hands back the text", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, text: "Client: X", lines: [], updatedAt: "2026-09-29T10:00:00Z" })));
    vi.stubGlobal("fetch", fetch);
    const out = await readBrain({ key: "szn_k" }, { branch: "West Bay" });
    expect(out).toEqual({ ok: true, text: "Client: X", lines: [], updatedAt: "2026-09-29T10:00:00Z" });
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(`${BRAIN_URL}?branch=West+Bay`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer szn_k");
  });

  it("says why when it cannot read, and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "unknown key" }), { status: 401 })));
    expect(await readBrain({ key: "bad" })).toEqual({ ok: false, error: "unknown key" });
    expect(await readBrain({ key: "" })).toEqual({ ok: false, error: "No hub key." });
  });
});
