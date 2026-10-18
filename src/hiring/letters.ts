/**
 * The six letters a candidate can receive, each built in one place so the
 * panel's preview and the email that goes can never tell two stories. Written
 * in the candidate's language, in the employer's name.
 *
 * A letter comes back as structured plain text, never HTML: the app pours it
 * into its own email shell and escapes it there. Every value here, a typed
 * brief or a candidate's name included, is raw text.
 */

import { counted } from "./counts.js";
import { momentIn, sayLength, sayMoment } from "./calendar.js";
import { LETTER_WORDS, patchWords, type LetterWordsPatch } from "./letter-words.js";
import { DEFAULT_TIME_ZONE, LANGUAGE_NAMES, fill, type Locale, type OtherLocale } from "./locale.js";
import type { Stage } from "./stages.js";

/**
 * The letters, and the stage each belongs to. A stage with no letter
 * (shortlist, interview) is the office's move, not the candidate's.
 * `received` is the one the form sends by itself the moment they apply.
 */
export const LETTERS = ["received", "invited", "trial", "offer", "hired", "rejected"] as const;
export type Letter = (typeof LETTERS)[number];
export type StageLetter = Exclude<Letter, "received">;

export function isLetter(value: unknown): value is Letter {
  return (LETTERS as readonly unknown[]).includes(value);
}

export const LETTER_FOR_STAGE: Partial<Record<Stage, StageLetter>> = {
  invited: "invited",
  trial: "trial",
  offer: "offer",
  hired: "hired",
  rejected: "rejected",
};

/** What a letter may need beyond the candidate and the role. */
export type LetterDetails = {
  /** Interview and first day: when, written out. */
  when?: string;
  /** The interview's day ("2026-10-05") and time ("11:00") on the office's clock; `when` is written from them in the candidate's language. */
  day?: string;
  time?: string;
  where?: string;
  withWhom?: string;
  bring?: string;
  /** How long the interview runs, in minutes ("45"); the letter says it in the candidate's language. */
  minutes?: string;
  /** Trial task: the brief and its deadline. */
  brief?: string;
  deadline?: string;
  /** A line about pay for the trial, as the office typed it ("This task is paid: QAR 300"). */
  paid?: string;
  /** Offer: start, salary, probation, how long it stands. */
  start?: string;
  salary?: string;
  probation?: string;
  validUntil?: string;
  /** First day: who to ask for at the door. */
  askFor?: string;
  /** Regret: a line of the office's own. */
  note?: string;
  /** Regret: "yes" when they came in to meet the office, which the letter thanks them for. */
  interviewed?: string;
};

/**
 * What a letter cannot go without. An invitation with no when or where is
 * not an invitation; the send stays shut until these are filled.
 */
export function letterNeeds(letter: Letter, d: LetterDetails): string[] {
  const missing = (label: string, value?: string) => (value?.trim() ? [] : [label]);
  switch (letter) {
    case "invited":
      return [...(d.day && d.time ? [] : missing("a day and a time", d.when)), ...missing("where", d.where)];
    case "trial":
      return [...missing("the brief", d.brief), ...missing("a deadline", d.deadline)];
    case "offer":
      return [...missing("a start date", d.start), ...missing("the salary", d.salary)];
    case "hired":
      return [...missing("the day", d.when), ...missing("where", d.where)];
    default:
      return [];
  }
}

export function letterLabel(letter: Letter): string {
  switch (letter) {
    case "received":
      return "Acknowledgement";
    case "invited":
      return "Interview invitation";
    case "trial":
      return "Trial task";
    case "offer":
      return "Offer";
    case "hired":
      return "First-day letter";
    case "rejected":
      return "Regret";
  }
}

/** The employer a letter speaks for. */
export type LetterBrand = {
  name: string;
  /** The name in Arabic letters, for Arabic letters; `name` when absent. */
  nameAr?: string;
  /** The careers page in a language: the acknowledgement's button. */
  careersUrl: (locale: Locale) => string;
  /**
   * What to bring on the first day, as it reads after "Bring", possessive
   * included ("your Qatar ID", "بطاقتك الشخصية القطرية"). A language without
   * one asks only for what the office lists.
   */
  idDocument?: { en: string; ar: string } & Partial<Record<OtherLocale, string>>;
  /** How long applications are kept, in months: the regret promises it. Match the erase timing. */
  keepMonths?: number;
  /** How long the office takes to answer, in days: the acknowledgement promises it. */
  replyDays?: number;
  /** How long an offer stands without a date of its own, in days. */
  offerDays?: number;
  /** The office's clock, for an interview picked as a day and a time. */
  timeZone?: string;
  /**
   * The employer's own wording over the house's, by language: a careers site
   * that answers on WhatsApp says so in its acknowledgement. Line by line;
   * whatever it leaves out stays the house's.
   */
  words?: Partial<Record<Locale, LetterWordsPatch>>;
};

export type LetterInput = {
  /** The candidate's full name; letters greet the first word of it. */
  name: string;
  /** The role's title in the letter's language (roleIn). */
  role: string;
  /** The English title, for the English story line; `role` when absent. */
  roleEn?: string;
  withPortfolio?: boolean;
  /** The day the application landed, written out in the letter's language. */
  receivedOn?: string;
  details?: LetterDetails;
};

export type LetterFact = { label: string; value: string; strong?: boolean };

export type BuiltLetter = {
  locale: Locale;
  dir: "ltr" | "rtl";
  subject: string;
  /** The inbox's preview line: the first paragraph, cut to 120 letters. */
  preheader: string;
  /** The small line over the title. */
  eyebrow: string;
  title: string;
  paragraphs: string[];
  facts: LetterFact[];
  action?: { label: string; url: string };
  closing: string;
  /** An English line for the candidate's story: what was sent. */
  summary: string;
};

const first = (name: string) => name.trim().split(/\s+/)[0] || name.trim();
const lines = (text: string | undefined) =>
  (text ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
const fact = (label: string, value: string | undefined, strong = false): LetterFact[] =>
  value?.trim() ? [{ label, value: value.trim(), ...(strong ? { strong } : {}) }] : [];
const whole = (n: number | undefined, fallback: number) => (Number.isInteger(n) && (n as number) > 0 && (n as number) < 1000 ? (n as number) : fallback);

/** A line in the candidate's language with every slot this employer and this person fill. */
function speaker(input: { name: string; role: string }, locale: Locale, brand: LetterBrand) {
  const name = locale === "ar" ? brand.nameAr?.trim() || brand.name : brand.name;
  // Chinese runs words together; a Latin name stands apart with a space on each side.
  const brandSlot = locale === "zh" && /\p{Script=Latin}/u.test(name) && !/\p{Script=Han}/u.test(name) ? ` ${name} ` : name;
  return (text: string, extra: Record<string, string | undefined> = {}) =>
    fill(text, {
      you: first(input.name),
      first: first(input.name),
      role: input.role.trim(),
      brand: brandSlot,
      reply: counted(whole(brand.replyDays, 7), "reply", locale),
      offer: counted(whole(brand.offerDays, 7), "offer", locale),
      keep: counted(whole(brand.keepMonths, 6), "keep", locale),
      ...extra,
    }).trim();
}

/** The letter in a language, from its words: the same facts and conditions in each. */
export function buildLetter(letter: Letter, input: LetterInput, locale: Locale, brand: LetterBrand): BuiltLetter {
  const W = patchWords(LETTER_WORDS[locale], brand.words?.[locale]);
  // An interview picked on the calendar is written in the candidate's own words.
  const picked = letter === "invited" ? momentIn(input.details?.day, input.details?.time, brand.timeZone ?? DEFAULT_TIME_ZONE) : null;
  const d: LetterDetails = picked ? { ...input.details, when: sayMoment(picked, locale, brand.timeZone ?? DEFAULT_TIME_ZONE) } : (input.details ?? {});
  const id = brand.idDocument?.[locale]?.trim();
  const say = speaker(input, locale, brand);
  // The story is read in English: its line names the role and the moment in English.
  const role = input.roleEn?.trim() || input.role.trim();
  const whenEn = picked ? sayMoment(picked, "en", brand.timeZone ?? DEFAULT_TIME_ZONE) : d.when?.trim();
  const tongue = locale === "en" ? "" : ` (${LANGUAGE_NAMES[locale]})`;

  let w: { subject: string; eyebrow: string; title: string; paragraphs: string[]; facts: LetterFact[]; closing: string; summary: string };
  switch (letter) {
    case "received": {
      const x = W.received;
      w = {
        subject: say(x.subject),
        eyebrow: x.eyebrow,
        title: say(x.headline),
        paragraphs: [say(x.body1), say(x.body2)],
        facts: [...fact(x.factRole, role), ...fact(x.factReceived, input.receivedOn), ...fact(x.factPapers, input.withPortfolio ? x.papersCvPortfolio : x.papersCv)],
        closing: x.closing,
        summary: `Acknowledged the application for ${role}${tongue}`,
      };
      break;
    }
    case "invited": {
      const x = W.invited;
      w = {
        subject: d.when?.trim() ? say(x.subjectWhen, { when: d.when.trim() }) : say(x.subject),
        eyebrow: x.eyebrow,
        title: say(x.headline),
        paragraphs: [say(x.body1), x.body2],
        facts: [
          ...fact(x.factWhen, d.when),
          ...fact(x.factLength, sayLength(d.minutes, locale) ?? undefined),
          ...fact(x.factWhere, d.where),
          ...fact(x.factWith, d.withWhom),
          ...fact(x.factBring, d.bring),
        ],
        closing: x.closing,
        summary: `Invited to interview for ${role}${whenEn ? ` on ${whenEn}` : ""}${tongue}`,
      };
      break;
    }
    case "trial": {
      const x = W.trial;
      w = {
        subject: say(x.subject),
        eyebrow: x.eyebrow,
        title: x.headline,
        paragraphs: [x.body1, ...lines(d.brief), d.deadline?.trim() ? say(x.sendBackBy, { deadline: d.deadline.trim() }) : x.sendBack, ...lines(d.paid)],
        facts: [...fact(x.factDeadline, d.deadline)],
        closing: x.closing,
        summary: `Sent the trial task for ${role}${tongue}`,
      };
      break;
    }
    case "offer": {
      const x = W.offer;
      w = {
        subject: say(x.subject),
        eyebrow: x.eyebrow,
        title: say(x.headline),
        paragraphs: [say(x.body1), x.body2],
        facts: [...fact(x.factRole, role), ...fact(x.factStart, d.start), ...fact(x.factSalary, d.salary, true), ...fact(x.factProbation, d.probation)],
        closing: d.validUntil?.trim() ? say(x.closingUntil, { validUntil: d.validUntil.trim() }) : say(x.closingDefault),
        summary: `Made an offer for ${role}${d.salary?.trim() ? ` at ${d.salary.trim()}` : ""}${tongue}`,
      };
      break;
    }
    case "hired": {
      const x = W.hired;
      // With nothing to bring at all, the line goes rather than point at an empty list.
      const bring = id ? say(x.bringId, { id }) : d.bring?.trim() ? x.bring : null;
      w = {
        subject: say(x.subject),
        eyebrow: x.eyebrow,
        title: say(x.headline),
        paragraphs: [x.body1, ...(bring ? [bring] : [])],
        facts: [...fact(x.factDay, d.when), ...fact(x.factWhere, d.where), ...fact(x.factBring, d.bring), ...fact(x.factAskFor, d.askFor)],
        closing: x.closing,
        summary: `Sent first-day details for ${role}${tongue}`,
      };
      break;
    }
    case "rejected": {
      const x = W.rejected;
      w = {
        subject: say(x.subject),
        eyebrow: x.eyebrow,
        title: say(x.headline),
        paragraphs: [say(d.interviewed === "yes" ? x.body1Met : x.body1), say(x.body2), ...lines(d.note)],
        facts: [],
        closing: x.closing,
        summary: `Sent a regret for ${role}${tongue}`,
      };
      break;
    }
  }
  return {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    subject: w.subject,
    preheader: (w.paragraphs[0] ?? "").slice(0, 120),
    eyebrow: w.eyebrow,
    title: w.title,
    paragraphs: w.paragraphs,
    facts: w.facts,
    // The acknowledgement points to the other roles.
    ...(letter === "received" ? { action: { label: W.openRoles, url: brand.careersUrl(locale) } } : {}),
    closing: w.closing,
    summary: w.summary,
  };
}

/**
 * The notices about an interview already booked: it moved, it is off, or it
 * is tomorrow. They belong to no stage; the office's move or its clock sends
 * them, each with the calendar file that keeps the candidate's own calendar
 * in step (interviewAttachment, with the same uid and one more sequence).
 */
export const INTERVIEW_NOTICES = ["moved", "cancelled", "reminder"] as const;
export type InterviewNotice = (typeof INTERVIEW_NOTICES)[number];

export function isInterviewNotice(value: unknown): value is InterviewNotice {
  return (INTERVIEW_NOTICES as readonly unknown[]).includes(value);
}

export function noticeLabel(notice: InterviewNotice): string {
  switch (notice) {
    case "moved":
      return "Interview moved";
    case "cancelled":
      return "Interview cancelled";
    case "reminder":
      return "Interview reminder";
  }
}

export type NoticeInput = {
  name: string;
  /** The role's title in the notice's language. */
  role: string;
  /** The English title, for the story line; `role` when absent. */
  roleEn?: string;
  /** The interview's start as an ISO moment: the new one for a move, the one it was for a cancel. */
  startsAt: string;
  minutes?: number;
  where?: string;
  withWhom?: string;
  /** A line of the office's own, after the words. */
  note?: string;
};

/** A notice in the candidate's language; null when `startsAt` is not a moment. */
export function buildInterviewNotice(notice: InterviewNotice, input: NoticeInput, locale: Locale, brand: LetterBrand): BuiltLetter | null {
  const at = new Date(input.startsAt);
  if (Number.isNaN(at.getTime())) return null;
  const W = patchWords(LETTER_WORDS[locale], brand.words?.[locale]);
  const x = W[notice];
  const zone = brand.timeZone ?? DEFAULT_TIME_ZONE;
  const when = sayMoment(at, locale, zone);
  const say = speaker(input, locale, brand);
  const role = input.roleEn?.trim() || input.role.trim();
  const whenEn = sayMoment(at, "en", zone);
  const tongue = locale === "en" ? "" : ` (${LANGUAGE_NAMES[locale]})`;
  // A move and a reminder carry the whole interview; a cancel only says which one is off.
  const facts =
    notice === "cancelled"
      ? []
      : [
          ...fact(W.invited.factWhen, when),
          ...fact(W.invited.factLength, sayLength(input.minutes, locale) ?? undefined),
          ...fact(W.invited.factWhere, input.where),
          ...fact(W.invited.factWith, input.withWhom),
        ];
  const paragraphs = [say(x.body1, { when }), say(x.body2, { when }), ...lines(input.note)];
  const summary =
    notice === "moved"
      ? `Interview for ${role} moved to ${whenEn}${tongue}`
      : notice === "cancelled"
        ? `Interview for ${role} on ${whenEn} cancelled${tongue}`
        : `Reminded of the interview for ${role} on ${whenEn}${tongue}`;
  return {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    subject: say(x.subject, { when }),
    preheader: (paragraphs[0] ?? "").slice(0, 120),
    eyebrow: x.eyebrow,
    title: say(x.headline, { when }),
    paragraphs,
    facts,
    closing: say(x.closing, { when }),
    summary,
  };
}

/**
 * The letter's idempotency key for Resend: its own words make it, so pressing
 * Send twice mails it once, and a corrected letter is a new one. `body` is
 * what goes (the rendered HTML). Web Crypto, so it runs anywhere.
 */
export async function letterKey(letter: Letter | InterviewNotice, id: string, subject: string, body: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject + body));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${letter}-${id}-${hex.slice(0, 32)}`;
}

/** A story line's letter, without the address: "Interview invitation, emailed to sam@example.com" → "Interview invitation". */
export function letterName(detail: string | null): string {
  return (detail ?? "A letter").replace(/,? emailed to .*$/, "").trim() || "A letter";
}
