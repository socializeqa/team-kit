/**
 * Phone numbers, for a fleet that works in Qatar and messages the world.
 *
 * Three projects each kept their own country list — one generated, one
 * hand-typed, one a third shape — and all three needed the same two
 * answers: what does this number look like written down, and what digits
 * do I hand an API. That is all this is.
 */
export interface Country {
    /** ISO 3166-1 alpha-2, uppercase. */
    iso: string;
    /** Calling code without the plus. */
    dial: string;
    name: string;
}
/**
 * The countries the fleet actually reaches — the Gulf, the Levant, the
 * places staff and clients come from, and the markets worked in. Not the
 * whole world: a picker nobody can scroll is worse than a short list, and
 * `parse` still accepts any number it is given.
 */
export declare const COUNTRIES: readonly Country[];
export declare const DEFAULT_COUNTRY = "QA";
/** Everything an API wants: digits with a country code, nothing else. */
export declare function digits(phone: string): string;
/**
 * Splits a stored number back into a country and the national part, so a
 * form can show a flag beside the digits somebody actually typed.
 * Longest dial code wins — 974 must beat 97 and 9.
 */
export declare function parse(phone: string): {
    country: Country;
    national: string;
} | null;
/** "+974 5036 8805" — how a number is written down for a human. */
export declare function format(phone: string): string;
/** A wa.me link, which needs bare digits. */
export declare function whatsappLink(phone: string, text?: string): string;
