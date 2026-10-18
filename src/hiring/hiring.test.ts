import { describe, expect, it } from "vitest";
import {
  APPLICATION_STAGES,
  asksYesNo,
  buildLetter,
  callerBucket,
  candidatesCsv,
  cleanFill,
  cleanScreening,
  counted,
  dueForErasing,
  erasedRow,
  faultWords,
  hiringPapers,
  buildInterviewNotice,
  INTERVIEW_NOTICES,
  interviewAttachment,
  interviewIcs,
  jobPostingLd,
  sayLength,
  LETTERS,
  letterKey,
  letterNeeds,
  movesFrom,
  pairAnswers,
  readAge,
  readYesNo,
  salaryLine,
  screenPrompt,
  stageLabel,
  stageShort,
  wasHired,
  type LetterBrand,
  type RawFill,
} from "../hiring.js";

const headers = (ip: string) => ({ get: (name: string) => (name === "x-forwarded-for" ? ip : null) });

describe("the walk", () => {
  it("offers the next step first, and a no that always asks why", () => {
    const moves = movesFrom("new");
    expect(moves[0]).toMatchObject({ kind: "next", to: "shortlist", primary: true });
    expect(moves.find((m) => m.kind === "reject")).toMatchObject({ to: "rejected", confirm: true, reason: "required" });
    expect(moves.some((m) => m.kind === "back")).toBe(false);
  });

  it("lets an interview skip the trial, and an offer end in a hire", () => {
    expect(movesFrom("interview").some((m) => m.kind === "skip" && m.to === "offer")).toBe(true);
    expect(movesFrom("offer")[0]).toMatchObject({ kind: "hire", to: "hired", primary: true, confirm: true });
  });

  it("only reopens a settled file", () => {
    for (const stage of ["hired", "rejected"]) expect(movesFrom(stage).map((m) => m.kind)).toEqual(["reopen"]);
    expect(movesFrom("nonsense")).toEqual([]);
  });

  it("names every stage in English and Arabic", () => {
    for (const stage of APPLICATION_STAGES) {
      expect(stageLabel(stage)).not.toBe("");
      expect(stageLabel(stage, "ar")).toMatch(/[؀-ۿ]/);
    }
    expect(stageShort("hired", "ar")).toBe("تعيين");
  });

  it("remembers a hire even after a reopen", () => {
    expect(wasHired("new", [{ kind: "stage", detail: "hired" }])).toBe(true);
    expect(wasHired("offer", [{ kind: "stage", detail: "offer" }])).toBe(false);
  });
});

describe("the careers door's checks", () => {
  it("reads an age within the bounds", () => {
    expect(readAge("29")).toBe(29);
    expect(readAge("17")).toBeNull();
    expect(readAge("abc")).toBeNull();
    expect(readAge("75", { min: 18, max: 80 })).toBe(75);
  });

  it("knows a yes-or-no question in both languages", () => {
    expect(asksYesNo("Do you hold a valid driving licence?")).toBe(true);
    expect(asksYesNo("هل تحمل رخصة قيادة سارية؟")).toBe(true);
    expect(asksYesNo("Why this role?")).toBe(false);
    expect(asksYesNo("Do you drive? Since when?")).toBe(false);
    expect(readYesNo("Yes")).toBe(true);
    expect(readYesNo("no")).toBe(false);
    expect(readYesNo("")).toBeNull();
  });

  it("pairs answers with the opening's own questions, and refuses a gap", () => {
    const questions = [{ prompt: "Do you drive?" }, { prompt: "Why this role?" }];
    expect(pairAnswers(questions, ["Yes", "I like people"])).toEqual([
      { prompt: "Do you drive?", answer: "Yes" },
      { prompt: "Why this role?", answer: "I like people" },
    ]);
    expect(pairAnswers(questions, ["Maybe", "I like people"])).toBeNull();
    expect(pairAnswers(questions, ["No"])).toBeNull();
  });

  it("counts an IPv6 caller by its /64 and an IPv4 one by itself", () => {
    expect(callerBucket(headers("203.0.113.9"))).toBe("203.0.113.9");
    expect(callerBucket(headers("::ffff:203.0.113.9"))).toBe("203.0.113.9");
    expect(callerBucket(headers("2001:db8:1:2:aaaa::1"))).toBe("2001:0db8:0001:0002::/64");
    expect(callerBucket(headers("2001:db8:1:2:bbbb::9"))).toBe("2001:0db8:0001:0002::/64");
  });

  it("words a refusal in the reader's language, the wait counted", () => {
    expect(faultWords("busy", "en", { minutes: 1 })).toContain("1 minute");
    expect(faultWords("busy", "en", { minutes: 15 })).toContain("15 minutes");
    expect(faultWords("closed", "ar")).toMatch(/[؀-ۿ]/);
  });

  it("files papers where nothing can climb out of its folder", () => {
    const papers = hiringPapers();
    const draft = papers.draftPath("0b6f6b0e-5a43-4c45-9a2e-1c3f0a9d8e71");
    expect(papers.isDraft(draft)).toBe(true);
    expect(papers.isDraft("drafts/../2026/someone-cv-12345678.pdf")).toBe(false);
    expect(papers.homePath("Zoë Example", "cv", "0b6f6b0e-5a43", 2026)).toBe("2026/zoe-example-cv-0b6f6b0e.pdf");
    expect(hiringPapers({ prefix: "hiring" }).draftPath("0b6f6b0e-5a43-4c45-9a2e-1c3f0a9d8e71")).toMatch(/^hiring\/drafts\//);
  });
});

describe("an opening's words", () => {
  it("writes the pay the way each language reads it", () => {
    const opening = { salary_min: 8000, salary_max: 10000, salary_note: "plus commission", salary_note_ar: "بالإضافة إلى العمولة" };
    expect(salaryLine(opening, "en")).toBe("QAR 8,000 to 10,000, plus commission");
    expect(salaryLine(opening, "ar")).toBe("من 8,000 إلى 10,000 ر.ق، بالإضافة إلى العمولة");
    expect(salaryLine({ salary_min: null, salary_max: null, salary_note: null }, "en")).toBeNull();
  });

  it("counts days and months by each language's own rules", () => {
    expect(counted(7, "reply", "en")).toBe("7 days");
    expect(counted(6, "keep", "ar")).toBe("6 أشهر");
    expect(counted(14, "offer", "ar")).toBe("14 يومًا");
    expect(counted(1, "keep", "ar")).toBe("شهر واحد");
    expect(counted(2, "keep", "zh")).toBe("两个月");
  });
});

describe("the letters", () => {
  const brand: LetterBrand = { name: "Example Co", careersUrl: (locale) => `https://example.com/${locale}/careers` };
  const details = {
    day: "2026-11-02",
    time: "11:00",
    where: "The office, 3rd floor",
    brief: "A one-page plan",
    deadline: "5 November",
    start: "1 December",
    salary: "QAR 9,000",
    when: "1 December, 9:00",
    askFor: "Sam",
  };

  it("holds an invitation back until it has a moment and a place", () => {
    expect(letterNeeds("invited", {})).toEqual(["a day and a time", "where"]);
    expect(letterNeeds("invited", { day: "2026-11-02", time: "11:00", where: "Office" })).toEqual([]);
    expect(letterNeeds("offer", { start: "1 Dec" })).toEqual(["the salary"]);
    expect(letterNeeds("rejected", {})).toEqual([]);
  });

  for (const locale of ["en", "ar", "fr", "it", "ru", "zh"] as const) {
    it(`writes all six letters in ${locale}, every slot filled`, () => {
      for (const letter of LETTERS) {
        const built = buildLetter(letter, { name: "Sam Example", role: "Office Manager", receivedOn: "2 November 2026", details }, locale, brand);
        const words = [built.subject, built.title, built.preheader, built.closing, ...built.paragraphs, ...built.facts.map((f) => `${f.label} ${f.value}`)].join("\n");
        expect(words, `${letter} in ${locale}`).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(built.subject.length).toBeGreaterThan(3);
        expect(built.summary).not.toMatch(/[؀-ۿ]/);
        expect(built.dir).toBe(locale === "ar" ? "rtl" : "ltr");
      }
    });
  }

  it("files an Arabic letter's story line in English", () => {
    const built = buildLetter("invited", { name: "سارة الأمين", role: "مدير مكتب", roleEn: "Office Manager", details }, "ar", brand);
    expect(built.summary).toMatch(/^Invited to interview for Office Manager on Monday,? 2 November 2026 at 11:00 \(Arabic\)$/);
    expect(built.title).toMatch(/[؀-ۿ]/);
  });

  it("names the employer in each letter", () => {
    const built = buildLetter("hired", { name: "Sam Example", role: "Office Manager", details }, "en", brand);
    expect(`${built.subject} ${built.title} ${built.paragraphs.join(" ")}`).toContain("Example Co");
  });

  it("says how long an interview runs, pays a trial and thanks someone who came in", () => {
    const invite = buildLetter("invited", { name: "Sam Example", role: "Office Manager", details: { ...details, minutes: "45" } }, "en", brand);
    expect(invite.facts).toContainEqual({ label: "Length", value: "45 minutes" });
    expect(buildLetter("invited", { name: "Sam", role: "Office Manager", details }, "en", brand).facts.some((f) => f.label === "Length")).toBe(false);
    const trial = buildLetter("trial", { name: "Sam", role: "Designer", details: { ...details, paid: "This task is paid: QAR 300." } }, "en", brand);
    expect(trial.paragraphs.at(-1)).toBe("This task is paid: QAR 300.");
    expect(buildLetter("rejected", { name: "Sam", role: "Designer", details: { interviewed: "yes" } }, "en", brand).paragraphs[0]).toMatch(/^Thank you for coming in/);
    expect(buildLetter("rejected", { name: "Sam", role: "Designer", details: {} }, "en", brand).paragraphs[0]).toMatch(/^We have read/);
  });

  it("lays an employer's own wording over the house's, line by line", () => {
    const own: LetterBrand = { ...brand, words: { en: { received: { body2: "If it fits, you will hear from us on WhatsApp." } } } };
    const built = buildLetter("received", { name: "Sam", role: "Designer" }, "en", own);
    expect(built.paragraphs[1]).toBe("If it fits, you will hear from us on WhatsApp.");
    expect(built.paragraphs[0]).toMatch(/^Thank you for applying/);
    expect(buildLetter("received", { name: "Sam", role: "Designer" }, "ar", own).paragraphs[1]).not.toMatch(/WhatsApp/);
  });

  for (const locale of ["en", "ar", "fr", "it", "ru", "zh"] as const) {
    it(`writes the three interview notices in ${locale}, every slot filled`, () => {
      for (const notice of INTERVIEW_NOTICES) {
        const built = buildInterviewNotice(
          notice,
          { name: "Sam Example", role: "Office Manager", startsAt: "2026-11-02T08:00:00.000Z", minutes: 45, where: "The office", withWhom: "Sam", note: "Bring your laptop." },
          locale,
          brand,
        );
        expect(built, `${notice} in ${locale}`).not.toBeNull();
        const words = [built!.subject, built!.title, built!.closing, ...built!.paragraphs, ...built!.facts.map((f) => `${f.label} ${f.value}`)].join("\n");
        expect(words, `${notice} in ${locale}`).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(built!.summary).not.toMatch(/[؀-ۿ]/);
        expect(built!.paragraphs.at(-1)).toBe("Bring your laptop.");
        expect(built!.facts.length).toBe(notice === "cancelled" ? 0 : 4);
      }
    });
  }

  it("files a notice's story line in English, on the office's clock", () => {
    const moved = buildInterviewNotice("moved", { name: "سارة", role: "مدير مكتب", roleEn: "Office Manager", startsAt: "2026-11-02T08:00:00.000Z" }, "ar", brand);
    expect(moved?.summary).toMatch(/^Interview for Office Manager moved to Monday,? 2 November 2026 at 11:00 \(Arabic\)$/);
    expect(buildInterviewNotice("reminder", { name: "Sam", role: "Designer", startsAt: "not a moment" }, "en", brand)).toBeNull();
  });

  it("keys a letter by its words, so a correction is a new letter", async () => {
    const a = await letterKey("rejected", "id-1", "Your application", "<p>One</p>");
    expect(a).toBe(await letterKey("rejected", "id-1", "Your application", "<p>One</p>"));
    expect(a).not.toBe(await letterKey("rejected", "id-1", "Your application", "<p>Two</p>"));
    expect(a.startsWith("rejected-id-1-")).toBe(true);
  });
});

describe("the interview's calendar file", () => {
  it("is UTC, escaped and folded at 75 octets", () => {
    const file = interviewIcs({
      uid: "interview-1@example.com",
      title: "Interview, Example Co: Office Manager; second round",
      startsAt: "2026-11-02T08:00:00.000Z",
      location: "Tower 1, 3rd floor, Example Street",
      description: `With Sam\nBring ${"a printed copy of your CV and certificates ".repeat(3)}`,
      prodId: "-//Example Co//Hiring//EN",
      now: new Date("2026-10-10T00:00:00.000Z"),
    });
    expect(file).not.toBeNull();
    const text = file as string;
    expect(text).toContain("DTSTART:20261102T080000Z");
    expect(text).toContain("DTEND:20261102T084500Z");
    expect(text).toContain("SUMMARY:Interview\\, Example Co: Office Manager\\; second round");
    expect(text).toContain("\\n");
    for (const line of text.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(interviewIcs({ uid: "x", title: "x", startsAt: "not a moment", prodId: "x" })).toBeNull();
  });
});

describe("the interview as an invitation", () => {
  const base = {
    uid: "interview-42@example.com",
    title: "Interview, Example Co: Office Manager",
    startsAt: "2026-11-02T08:00:00.000Z",
    minutes: 60,
    prodId: "-//Example Co//Hiring//EN",
    now: new Date("2026-10-10T00:00:00.000Z"),
    organizer: { email: "hello@example.com", name: "Example Co" },
    attendee: { email: "sam@example.com", name: 'Sam "the" Example' },
  };
  const read = (text: string | null) => (text ?? "").replace(/\r\n /g, "").split("\r\n");

  it("invites the candidate, who can answer it, with the organizer RFC 5546 asks for", () => {
    const lines = read(interviewIcs(base));
    expect(lines).toContain("METHOD:REQUEST");
    expect(lines).toContain('ORGANIZER;CN="Example Co":mailto:hello@example.com');
    expect(lines).toContain('ATTENDEE;CN="Sam the Example";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:sam@example.com');
    expect(lines).toContain("DTEND:20261102T090000Z");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines.some((line) => line.startsWith("SEQUENCE"))).toBe(false);
  });

  it("moves it with a higher sequence, and cancels it for the same person", () => {
    expect(read(interviewIcs({ ...base, sequence: 2 }))).toContain("SEQUENCE:2");
    const cancel = read(interviewIcs({ ...base, sequence: 3, cancelled: true }));
    expect(cancel).toContain("METHOD:CANCEL");
    expect(cancel).toContain("STATUS:CANCELLED");
    expect(cancel).toContain("SEQUENCE:3");
    expect(cancel).toContain('ATTENDEE;CN="Sam the Example":mailto:sam@example.com');
  });

  it("publishes a plain file when nobody can be invited", () => {
    const lines = read(interviewIcs({ ...base, attendee: { email: "not an address" } }));
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines.some((line) => line.startsWith("ATTENDEE"))).toBe(false);
  });

  it("goes as an attachment whose type names its method", () => {
    const file = interviewAttachment({ ...base, cancelled: true, sequence: 1 });
    expect(file?.filename).toBe("cancel.ics");
    expect(file?.contentType).toBe("text/calendar; charset=UTF-8; method=CANCEL");
    expect(Buffer.from(file!.content, "base64").toString("utf8")).toBe(interviewIcs({ ...base, cancelled: true, sequence: 1 }));
    expect(interviewAttachment({ ...base, startsAt: "nope" })).toBeNull();
  });

  it("says the length in the reader's language", () => {
    expect(sayLength("45", "en")).toBe("45 minutes");
    expect(sayLength(90, "fr")).toBe("90 minutes");
    expect(sayLength("3", "en")).toBeNull();
    expect(sayLength("soon", "en")).toBeNull();
  });
});

describe("the CV form fill", () => {
  const raw: RawFill = { first_name: "SARA", last_name: "AL-AMIN", email: "sara@example.com", phone: "+44 20 7946 0018", birth_date: "1996-12-20", age: 0, nationality: "lb" };
  const toPhone = (written: string) => (written.replace(/\D/g, "").length >= 8 ? { iso: "GB", dial: "44", national: "2079460018" } : null);

  it("keeps what checks out, in the form's shapes", () => {
    expect(cleanFill(raw, new Date("2026-10-10T00:00:00Z"), { toPhone })).toEqual({
      first_name: "Sara",
      last_name: "Al-Amin",
      email: "sara@example.com",
      phone: { iso: "GB", dial: "44", national: "2079460018" },
      age: "29",
      nationality: "LB",
    });
  });

  it("leaves out what does not", () => {
    const found = cleanFill({ ...raw, email: "not an email", phone: "12", birth_date: "", age: 12, nationality: "XX" }, new Date("2026-10-10T00:00:00Z"), { toPhone });
    expect(found).toEqual({ first_name: "Sara", last_name: "Al-Amin" });
  });
});

describe("the AI reader", () => {
  it("never shows it the age, gender or nationality, and names blank questions", () => {
    const prompt = screenPrompt(
      { title: "Office Manager", department: null, employment_type: "full_time", location: "Lusail", summary: "Runs the office.", description: "Long words.", requirements: null, responsibilities: null, questions: [{ prompt: "Do you drive?" }, { prompt: "Why us?" }] },
      { name: "Sam Example", portfolio_url: null, cover_note: null, answers: [{ prompt: "Do you drive?", answer: "Yes" }] },
      [{ filename: "cv.pdf" }],
      "10 October 2026",
    );
    expect(prompt).toContain("Today is 10 October 2026.");
    expect(prompt).toContain("Questions they left blank:\nWhy us?");
    expect(prompt).not.toMatch(/nationality|gender|\bage\b/i);
  });

  it("makes the answer safe to save", () => {
    expect(cleanScreening({ fit_score: 104.6, verdict: "Strong sales record — no Qatar experience." })).toEqual({ fit_score: 100, verdict: "Strong sales record, no Qatar experience." });
    expect(cleanScreening({ fit_score: "high", verdict: "x" })).toBeNull();
    expect(cleanScreening(null)).toBeNull();
  });
});

describe("erasing", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const base = { stage: "rejected", deletedAt: null, erasedAt: null, everHired: false };

  it("counts six months from the no itself", () => {
    expect(dueForErasing({ ...base, stageAt: "2026-04-01T00:00:00Z" }, now)).toBe("rejected");
    expect(dueForErasing({ ...base, stageAt: "2026-09-01T00:00:00Z" }, now)).toBeNull();
  });

  it("erases a deleted file after a day, and never a hire", () => {
    expect(dueForErasing({ ...base, stage: "new", stageAt: null, deletedAt: "2026-10-08T00:00:00Z" }, now)).toBe("deleted");
    expect(dueForErasing({ ...base, stageAt: "2025-01-01T00:00:00Z", everHired: true }, now)).toBeNull();
    expect(dueForErasing({ ...base, stageAt: "2025-01-01T00:00:00Z", erasedAt: "2026-01-01T00:00:00Z" }, now)).toBeNull();
  });

  it("blanks the person and stamps when", () => {
    const row = erasedRow(now);
    expect(row).toMatchObject({ name: "Erased", cv_path: null, answers: [], erased_at: now.toISOString() });
  });
});

describe("Google's JobPosting", () => {
  it("carries the pay, the place and a rolling end date", () => {
    const ld = jobPostingLd(
      {
        slug: "office-manager",
        title: "Office Manager",
        description: "Runs the office.",
        responsibilities: ["Keep the calendar"],
        requirements: ["Three years in an office"],
        employmentType: "full_time",
        postedAt: "2026-10-01T09:00:00Z",
        pay: { min: 8000, max: 10000 },
        url: "https://example.com/careers/office-manager",
        locale: "en",
      },
      { name: "Example Co", url: "https://example.com", address: { locality: "Lusail", country: "QA" }, currency: "QAR" },
      new Date("2026-10-10T00:00:00Z"),
    );
    expect(ld).toMatchObject({
      "@type": "JobPosting",
      employmentType: "FULL_TIME",
      datePosted: "2026-10-01",
      validThrough: "2026-11-09",
      baseSalary: { currency: "QAR", value: { minValue: 8000, maxValue: 10000, unitText: "MONTH" } },
      jobLocation: { address: { addressLocality: "Lusail", addressCountry: "QA" } },
    });
    expect(ld.description).toContain("• Keep the calendar");
  });
});

describe("the spreadsheet", () => {
  it("opens as UTF-8 and never runs a candidate's words as a formula", () => {
    const csv = candidatesCsv(
      [{ name: "=HYPERLINK(\"x\")", note: 'Said "hello", then left' }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Note", value: (r) => r.note },
      ],
    );
    expect(csv.startsWith("﻿Name,Note\r\n")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"Said ""hello"", then left"`);
  });
});
