/**
 * The languages a careers site can speak, and the small grammar the letters
 * and the form need in each: how a day is written, and which plural form a
 * number takes. Every app speaks at least English and Arabic; the others are
 * written where an app has them.
 */
export declare const LOCALES: readonly ["en", "ar", "fr", "it", "ru", "zh"];
export type Locale = (typeof LOCALES)[number];
/** The languages beyond the office's own two. */
export type OtherLocale = Exclude<Locale, "en" | "ar">;
/** A panel speaks English, and Arabic in some apps; the candidate-facing words go further. */
export type PanelLocale = "en" | "ar";
export declare function isLocale(value: unknown): value is Locale;
/** Each language's name in English, for the story the office reads. */
export declare const LANGUAGE_NAMES: Record<Locale, string>;
/** How each language writes a day (Intl locale tags). */
export declare const DATE_TAGS: Record<Locale, string>;
/** The house's clock: every office the team serves keeps Doha time unless it says otherwise. */
export declare const DEFAULT_TIME_ZONE = "Asia/Qatar";
/** A plural category for a whole number in a language, by CLDR's rules (Intl ships them). */
export declare function pluralOf(n: number, locale: Locale): Intl.LDMLPluralRule;
/** Text with `{key}` slots filled; a slot with no value is left as it is, so a test can catch it. */
export declare function fill(text: string, values: Record<string, string | undefined>): string;
