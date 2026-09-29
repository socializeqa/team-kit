import { describe, expect, it } from "vitest";
import { hideKeys, onKeyedPage, scrubber } from "./scrub.js";

// Socialize's own rules: the tests below are its scrubber's, carried over.
const SOCIALIZE = { paths: ["/d/plan/", "/d/", "/portal/"], hosts: ["portal."] };
const scrub = scrubber(SOCIALIZE);

describe("scrubber", () => {
  it("hides the key in every keyed address, wherever it was written", () => {
    const event = scrub({
      request: {
        url: "https://socialize.qa/d/abc123def456ghi789?month=2026-09",
        headers: { Referer: "https://socialize.qa/portal/leona-cafe/requests" },
      },
      breadcrumbs: [
        { data: { from: "/portal/leona-cafe/requests", to: "/d/plan/tok-en-xyz" } },
        { data: { url: "/admin/finances/invoices" } },
      ],
      spans: [
        { description: "GET https://socialize.qa/d/abc123?x=1" },
        { description: "GET https://portal.socialize.qa/leona-cafe/vault" },
      ],
      exception: { values: [{ value: "Failed to fetch /d/abc123 (500)" }] },
    });
    expect(event.request.url).toBe("https://socialize.qa/d/[secret]?month=2026-09");
    expect(event.request.headers.Referer).toBe("https://socialize.qa/portal/[secret]/requests");
    expect(event.breadcrumbs[0].data).toEqual({ from: "/portal/[secret]/requests", to: "/d/plan/[secret]" });
    expect(event.breadcrumbs[1].data).toEqual({ url: "/admin/finances/invoices" });
    expect(event.spans[0].description).toBe("GET https://socialize.qa/d/[secret]?x=1");
    expect(event.spans[1].description).toBe("GET https://portal.socialize.qa/[secret]/vault");
    expect(event.exception.values[0].value).toBe("Failed to fetch /d/[secret] (500)");
  });

  it("survives a self-referencing event and leaves an empty one alone", () => {
    const loop: { self?: unknown; url: string } = { url: "/d/key" };
    loop.self = loop;
    expect(scrub(loop).url).toBe("/d/[secret]");
    expect(scrub({})).toEqual({});
  });

  it("never writes into a getter-only property or the SDK's own objects", () => {
    const readOnly = Object.defineProperty({}, "$", { get: () => "/d/key", enumerable: true });
    class Buffer {
      items = ["/d/key"];
    }
    const buffer = new Buffer();
    const event = { request: { url: "/d/key" }, extra: { readOnly }, sdkProcessingMetadata: { buffer, readOnly } };
    expect(() => scrub(event)).not.toThrow();
    expect(event.request.url).toBe("/d/[secret]");
    expect(buffer.items[0]).toBe("/d/key");
  });

  it("drops every cookie", () => {
    const event = scrub({
      request: {
        url: "https://admin.socialize.qa/finances",
        cookies: { sz_portal: "passport", "sb-access-token": "session" },
        headers: { Cookie: "sz_portal=passport", "user-agent": "Safari" },
      },
    });
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.headers).toEqual({ "user-agent": "Safari" });
    expect(event.request.url).toBe("https://admin.socialize.qa/finances");
  });

  it("blanks a key carried in the query, and only the key", () => {
    const hide = (text: string) => hideKeys({ query: ["code", "token", "token_hash"] }, text);
    expect(hide("https://admin.xcapital.qa/join?code=abc123&next=/team")).toBe("https://admin.xcapital.qa/join?code=[secret]&next=/team");
    expect(hide("/storage/v1/upload/sign/cv.pdf?token=eyJx.y")).toBe("/storage/v1/upload/sign/cv.pdf?token=[secret]");
    expect(hide("/auth/confirm?type=invite&token_hash=zz")).toBe("/auth/confirm?type=invite&token_hash=[secret]");
    expect(hide("/search?barcode=123")).toBe("/search?barcode=123");
  });
});

describe("onKeyedPage", () => {
  it("names the keyed pages, by path, host or query, and not the rest", () => {
    const at = (hostname: string, pathname: string, search = "") => onKeyedPage({ ...SOCIALIZE, query: ["code"] }, { hostname, pathname, search });
    expect(at("socialize.qa", "/d/abc")).toBe(true);
    expect(at("socialize.qa", "/d/plan/abc")).toBe(true);
    expect(at("localhost", "/portal/leona")).toBe(true);
    expect(at("portal.socialize.qa", "/leona/vault")).toBe(true);
    expect(at("admin.socialize.qa", "/join", "?code=abc")).toBe(true);
    expect(at("admin.socialize.qa", "/finances")).toBe(false);
    expect(at("socialize.qa", "/")).toBe(false);
  });
});
