/**
 * Countries for a public form: a nationality picker, a phone number's dialling
 * code. The names come from the runtime's own region list
 * (Intl.DisplayNames), so every language comes for free, corrected where the
 * list's name is not the one people in the Gulf use, and searchable by an old
 * or a short name too.
 *
 * Zero dependencies: the app hands in the codes and dialling codes it knows
 * (most read them from libphonenumber-js: getCountries, getCountryCallingCode).
 * The short list of the places staff and clients come from stays in `phone`.
 */
export type CountryCode = {
    iso: string;
    dial: string;
};
/** A country as a picker shows it: its code, dialling code, its name in the reader's language and in English (what the panel stores). */
export type NamedCountry = CountryCode & {
    name: string;
    english: string;
};
/** Where the region list's official name is not the one a Gulf company uses. */
export declare const COUNTRY_NAME_FIXES: Record<string, Record<string, string>>;
/** The names people still type that the official list no longer uses. */
export declare const COUNTRY_ALIASES: Record<string, readonly string[]>;
/** A country's name in a language ("LB", "ar" → "لبنان"); the code itself when the runtime cannot name it. */
export declare function countryName(iso: string, locale: string): string;
/** The codes named in a language, the home country first and the rest in that language's alphabetical order. */
export declare function namedCountries(codes: readonly CountryCode[], locale: string, home?: string): NamedCountry[];
/** Does this country answer to what was typed: its name in either language, its code, an old name, or its dialling code? */
export declare function matchesCountry(country: NamedCountry, typed: string): boolean;
/** The code of a country written by its English name, as a form stores it ("Lebanon" → "LB"); null when none matches. */
export declare function countryByName(name: string, countries: readonly NamedCountry[]): string | null;
