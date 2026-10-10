/**
 * The languages a careers site can speak, and the small grammar the letters
 * and the form need in each: how a day is written, and which plural form a
 * number takes. Every app speaks at least English and Arabic; the others are
 * written where an app has them.
 */
export const LOCALES = ["en", "ar", "fr", "it", "ru", "zh"];
export function isLocale(value) {
    return LOCALES.includes(value);
}
/** Each language's name in English, for the story the office reads. */
export const LANGUAGE_NAMES = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    it: "Italian",
    ru: "Russian",
    zh: "Chinese",
};
/** How each language writes a day (Intl locale tags). */
export const DATE_TAGS = { en: "en-GB", ar: "ar-QA", fr: "fr-FR", it: "it-IT", ru: "ru-RU", zh: "zh-CN" };
/** The house's clock: every office the team serves keeps Doha time unless it says otherwise. */
export const DEFAULT_TIME_ZONE = "Asia/Qatar";
/** A plural category for a whole number in a language, by CLDR's rules (Intl ships them). */
export function pluralOf(n, locale) {
    return new Intl.PluralRules(locale).select(n);
}
/** Text with `{key}` slots filled; a slot with no value is left as it is, so a test can catch it. */
export function fill(text, values) {
    return text.replace(/\{(\w+)\}/g, (all, key) => values[key] ?? all);
}
