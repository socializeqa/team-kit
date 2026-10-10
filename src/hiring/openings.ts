/**
 * An opening as the careers pages and the panel share it: its job type and
 * status, its public address, the salary line, its screening questions, and
 * its words in the languages beyond English and Arabic.
 *
 * The office writes a role in English and Arabic, in the opening's own
 * columns (`title`, `title_ar`…); other languages are kept on the opening as
 * `translations`, a JSON object by language. A row with no `translations` at
 * all is simply an English and Arabic role.
 */

import { LOCALES, type Locale, type OtherLocale } from "./locale.js";

/** How many screening questions an opening asks: one number for the editor, the save and the form. */
export const MAX_QUESTIONS = 10;

/**
 * A screening question: asked in English, and in Arabic on the Arabic page
 * when it has `prompt_ar`. `label` is what the reader is shown, set by the
 * careers page in its language. The answer always keeps the English prompt,
 * so the panel reads one language.
 */
export type Question = { prompt: string; prompt_ar?: string; label?: string };
export type Answer = { prompt: string; answer: string };

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time", ar: "دوام كامل", fr: "Temps plein", it: "Tempo pieno", ru: "Полный день", zh: "全职" },
  { value: "part_time", label: "Part-time", ar: "دوام جزئي", fr: "Temps partiel", it: "Part-time", ru: "Неполный день", zh: "兼职" },
  { value: "freelance", label: "Freelance", ar: "عمل حر", fr: "Freelance", it: "Freelance", ru: "Фриланс", zh: "自由职业" },
  { value: "internship", label: "Internship", ar: "تدريب", fr: "Stage", it: "Stage", ru: "Стажировка", zh: "实习" },
] as const;

export function employmentTypeLabel(type: string, locale: Locale = "en"): string {
  const entry = EMPLOYMENT_TYPES.find((each) => each.value === type);
  if (!entry) return type;
  return locale === "en" ? entry.label : entry[locale];
}

export const OPENING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

/** An opening on a chip: live on the site glows, a draft or a closed one simply is. */
export function openingChip(status: string): { value: string; tone: "good" | "quiet" } {
  return status === "open" ? { value: "Open", tone: "good" } : { value: status === "draft" ? "Draft" : "Closed", tone: "quiet" };
}

/**
 * The public address of a new opening, from its title: lowercase words joined
 * by hyphens. Minted once; the caller adds a number if it is taken. A title
 * with no Latin letters (Arabic only) gets the fallback.
 */
export function slugFrom(title: string, fallback = "role"): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || fallback
  );
}

/** A role in a language beyond English and Arabic, as the opening keeps it. */
export type RoleWords = {
  title?: string;
  department?: string;
  location?: string;
  summary?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  salary_note?: string | null;
  /** The screening questions, in the order of `questions_from`. */
  questions?: string[];
  /**
   * The English questions these were written for, in the same order. A
   * question is found by its English words, never by its place, so inserting
   * or moving one never pairs a translation with the wrong question. An older
   * translation without it goes by place.
   */
  questions_from?: string[];
  /** A mark of the English these were written from, so a translation knows when the English changed. */
  source?: string;
};

/** The opening's words in another language, or null for English, Arabic, or one it is not written in. */
export function wordsIn(translations: unknown, locale: Locale): RoleWords | null {
  if (locale === "en" || locale === "ar" || !translations || typeof translations !== "object") return null;
  const words = (translations as Record<string, unknown>)[locale];
  return words && typeof words === "object" ? (words as RoleWords) : null;
}

/** A question in another language: found by its English words; an older translation goes by place. */
export function questionIn(words: RoleWords | null, prompt: string, place: number): string | undefined {
  if (!words?.questions) return undefined;
  if (words.questions_from) {
    const at = words.questions_from.indexOf(prompt);
    return at >= 0 ? words.questions[at]?.trim() || undefined : undefined;
  }
  return words.questions[place]?.trim() || undefined;
}

/**
 * The languages a role can be read in: English always, Arabic when it has an
 * Arabic title, and each other language it has a title in, among the
 * languages the app speaks.
 */
export function roleLanguages(opening: { title_ar?: string | null; translations?: unknown }, locales: readonly Locale[] = LOCALES): Locale[] {
  return locales.filter((locale) =>
    locale === "en" ? true : locale === "ar" ? Boolean(opening.title_ar?.trim()) : Boolean(wordsIn(opening.translations, locale)?.title?.trim()),
  );
}

/** The role's title in a language, English where it has none. */
export function roleIn(locale: Locale, opening: { title: string; title_ar?: string | null; translations?: unknown }): string {
  const local = wordsIn(opening.translations, locale)?.title?.trim();
  if (local) return local;
  return locale === "ar" && opening.title_ar?.trim() ? opening.title_ar : opening.title;
}

export type SalaryOpening = {
  salary_min: number | null;
  salary_max: number | null;
  salary_note: string | null;
  salary_note_ar?: string | null;
  translations?: unknown;
};

/**
 * The salary line, or null when the opening shows none. English writes the
 * currency before the figure, Arabic its own short form after it, and the
 * other languages take the figures with a dash between, which reads the same
 * in each.
 */
export function salaryLine(
  opening: SalaryOpening,
  locale: Locale = "en",
  { currency = "QAR", currencyAr = "ر.ق" }: { currency?: string; currencyAr?: string } = {},
): string | null {
  const figure = (n: number) => n.toLocaleString("en-US");
  const { salary_min: min, salary_max: max } = opening;
  const one = min || max;
  const range =
    locale === "ar"
      ? min && max
        ? `من ${figure(min)} إلى ${figure(max)} ${currencyAr}`
        : one
          ? `${figure(one)} ${currencyAr}`
          : null
      : min && max
        ? locale === "en"
          ? `${currency} ${figure(min)} to ${figure(max)}`
          : `${currency} ${figure(min)} – ${figure(max)}`
        : one
          ? `${currency} ${figure(one)}`
          : null;
  const note =
    locale === "ar"
      ? opening.salary_note_ar || opening.salary_note
      : locale === "en"
        ? opening.salary_note
        : wordsIn(opening.translations, locale as OtherLocale)?.salary_note || opening.salary_note;
  if (range && note) return `${range}${locale === "ar" ? "، " : ", "}${note}`;
  return range ?? note ?? null;
}
