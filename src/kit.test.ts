import { describe, expect, it } from "vitest";
import { formatAmount, formatQAR, lineTotal, qarInWords, round2 } from "./money.js";
import { COUNTRIES, digits, format, parse, whatsappLink } from "./phone.js";
import { jobFinished, watched } from "./sentry.js";
import { render } from "./telegram.js";
import { digitsOnly } from "./whatsapp.js";

describe("money", () => {
  it("rounds without a floating-point tail", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it("prints riyals the way a paper does", () => {
    expect(formatQAR(1250)).toBe("QAR 1,250.00");
    expect(formatQAR(0)).toBe("QAR 0.00");
    expect(formatAmount(99.5)).toBe("99.50");
  });

  it("says the amount out loud", () => {
    expect(qarInWords(1250)).toBe(
      "Qatari Riyals One Thousand Two Hundred Fifty Only",
    );
    expect(qarInWords(0)).toBe("Qatari Riyals Zero Only");
    expect(qarInWords(15)).toBe("Qatari Riyals Fifteen Only");
    expect(qarInWords(100)).toBe("Qatari Riyals One Hundred Only");
  });

  it("carries fils when there are any", () => {
    expect(qarInWords(10.5)).toBe("Qatari Riyals Ten and Fifty Fils Only");
  });

  it("multiplies a line without drifting", () => {
    expect(lineTotal(3, 33.33)).toBe(99.99);
    expect(lineTotal(0, 500)).toBe(0);
  });
});

describe("phone", () => {
  it("keeps only digits", () => {
    expect(digits("+974 5036 8805")).toBe("97450368805");
    expect(digits("(974) 5036-8805")).toBe("97450368805");
  });

  it("splits a stored number back apart", () => {
    const parsed = parse("+97450368805");
    expect(parsed?.country.iso).toBe("QA");
    expect(parsed?.national).toBe("50368805");
  });

  it("prefers the longest dial code", () => {
    // 974 must win over 97 and 9 — a shorter match would misread Qatar.
    expect(parse("97450368805")?.country.iso).toBe("QA");
    expect(parse("13105551234")?.country.iso).toBe("US");
  });

  it("writes a Qatari number as two fours", () => {
    expect(format("97450368805")).toBe("+974 5036 8805");
  });

  it("still shows an unknown country as digits", () => {
    expect(format("99999999999")).toMatch(/^\+/);
    expect(format("")).toBe("");
  });

  it("builds a wa.me link", () => {
    expect(whatsappLink("+974 5036 8805")).toBe("https://wa.me/97450368805");
    expect(whatsappLink("97450368805", "hi there")).toContain("?text=hi%20there");
  });

  it("has no duplicate dial codes or isos", () => {
    const isos = COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });
});

describe("telegram", () => {
  it("escapes what HTML mode would swallow", () => {
    expect(render({ chatId: "1", title: "A & B <tag>" })).toContain(
      "A &amp; B &lt;tag&gt;",
    );
  });

  it("assembles title, facts and note in order", () => {
    const text = render({
      chatId: "1",
      emoji: "💰",
      title: "Payment received",
      subtitle: "Leona Cafe",
      lines: [{ icon: "🧾", label: "Invoice", value: "INV-2026-014" }],
      note: "by Damine",
    });
    expect(text.split("\n")[0]).toBe("💰 <b>Payment received</b>");
    expect(text).toContain("🧾 <b>Invoice</b> INV-2026-014");
    expect(text.trimEnd().endsWith("<i>by Damine</i>")).toBe(true);
  });
});

describe("whatsapp", () => {
  it("hands Meta bare digits", () => {
    expect(digitsOnly("+974 5036 8805")).toBe("97450368805");
  });
});

describe("sentry crons", () => {
  const DSN = "https://abc123@o4511850408181760.ingest.us.sentry.io/4511852075810816";
  const calls: { url: string; body: unknown }[] = [];
  const stub = () => {
    calls.length = 0;
    globalThis.fetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
  };

  it("builds the check-in url from the DSN", async () => {
    stub();
    await jobFinished({ dsn: DSN }, "nightly-sweep", true);
    expect(calls[0].url).toBe(
      "https://o4511850408181760.ingest.us.sentry.io/api/4511852075810816/cron/nightly-sweep/abc123/",
    );
  });

  it("says nothing at all when the DSN is missing or malformed", async () => {
    stub();
    await jobFinished({ dsn: "" }, "nightly-sweep", true);
    await jobFinished({ dsn: "not-a-dsn" }, "nightly-sweep", true);
    expect(calls).toHaveLength(0);
  });

  // The close must land on the SAME check-in whatever order the two
  // requests arrive in — slug-only correlation raced, filed the ok as a
  // second check-in, and the open one aged into "Cron failure" (Damine
  // auto-statements, five nights in Aug 2026).
  it("threads one minted check_in_id through both ends of a watched run", async () => {
    stub();
    await watched({ dsn: DSN }, "sweep", "0 5 * * *", async () => new Response(null, { status: 200 }));
    const [open, close] = calls.map((c) => c.body as { check_in_id?: string; status: string });
    expect(open.status).toBe("in_progress");
    expect(close.status).toBe("ok");
    expect(open.check_in_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(close.check_in_id).toBe(open.check_in_id);
  });

  // A 500 is how the sweeps report a bad night; they do not throw.
  it("counts a 5xx as a failed run, not a healthy one", async () => {
    stub();
    await watched({ dsn: DSN }, "sweep", "0 5 * * *", async () => new Response(null, { status: 500 }));
    expect((calls[1].body as { status: string }).status).toBe("error");
  });

  it("reports a throw as failed and still rethrows it", async () => {
    stub();
    await expect(
      watched({ dsn: DSN }, "sweep", "0 5 * * *", async () => {
        throw new Error("database is gone");
      }),
    ).rejects.toThrow("database is gone");
    expect((calls[1].body as { status: string }).status).toBe("error");
  });

  it("hands Sentry the schedule so a run that never happens is noticed", async () => {
    stub();
    await watched({ dsn: DSN }, "sweep", "55 8,15 * * *", async () => new Response(null, { status: 200 }));
    const config = (calls[0].body as { monitor_config: { schedule: { value: string } } }).monitor_config;
    expect(config.schedule.value).toBe("55 8,15 * * *");
  });
});
