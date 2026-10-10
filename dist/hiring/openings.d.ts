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
import { type Locale } from "./locale.js";
/** How many screening questions an opening asks: one number for the editor, the save and the form. */
export declare const MAX_QUESTIONS = 10;
/**
 * A screening question: asked in English, and in Arabic on the Arabic page
 * when it has `prompt_ar`. `label` is what the reader is shown, set by the
 * careers page in its language. The answer always keeps the English prompt,
 * so the panel reads one language.
 */
export type Question = {
    prompt: string;
    prompt_ar?: string;
    label?: string;
};
export type Answer = {
    prompt: string;
    answer: string;
};
export declare const EMPLOYMENT_TYPES: readonly [{
    readonly value: "full_time";
    readonly label: "Full-time";
    readonly ar: "دوام كامل";
    readonly fr: "Temps plein";
    readonly it: "Tempo pieno";
    readonly ru: "Полный день";
    readonly zh: "全职";
}, {
    readonly value: "part_time";
    readonly label: "Part-time";
    readonly ar: "دوام جزئي";
    readonly fr: "Temps partiel";
    readonly it: "Part-time";
    readonly ru: "Неполный день";
    readonly zh: "兼职";
}, {
    readonly value: "freelance";
    readonly label: "Freelance";
    readonly ar: "عمل حر";
    readonly fr: "Freelance";
    readonly it: "Freelance";
    readonly ru: "Фриланс";
    readonly zh: "自由职业";
}, {
    readonly value: "internship";
    readonly label: "Internship";
    readonly ar: "تدريب";
    readonly fr: "Stage";
    readonly it: "Stage";
    readonly ru: "Стажировка";
    readonly zh: "实习";
}];
export declare function employmentTypeLabel(type: string, locale?: Locale): string;
export declare const OPENING_STATUSES: readonly [{
    readonly value: "draft";
    readonly label: "Draft";
}, {
    readonly value: "open";
    readonly label: "Open";
}, {
    readonly value: "closed";
    readonly label: "Closed";
}];
/** An opening on a chip: live on the site glows, a draft or a closed one simply is. */
export declare function openingChip(status: string): {
    value: string;
    tone: "good" | "quiet";
};
/**
 * The public address of a new opening, from its title: lowercase words joined
 * by hyphens. Minted once; the caller adds a number if it is taken. A title
 * with no Latin letters (Arabic only) gets the fallback.
 */
export declare function slugFrom(title: string, fallback?: string): string;
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
export declare function wordsIn(translations: unknown, locale: Locale): RoleWords | null;
/** A question in another language: found by its English words; an older translation goes by place. */
export declare function questionIn(words: RoleWords | null, prompt: string, place: number): string | undefined;
/**
 * The languages a role can be read in: English always, Arabic when it has an
 * Arabic title, and each other language it has a title in, among the
 * languages the app speaks.
 */
export declare function roleLanguages(opening: {
    title_ar?: string | null;
    translations?: unknown;
}, locales?: readonly Locale[]): Locale[];
/** The role's title in a language, English where it has none. */
export declare function roleIn(locale: Locale, opening: {
    title: string;
    title_ar?: string | null;
    translations?: unknown;
}): string;
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
export declare function salaryLine(opening: SalaryOpening, locale?: Locale, { currency, currencyAr }?: {
    currency?: string;
    currencyAr?: string;
}): string | null;
