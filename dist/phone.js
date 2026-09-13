/**
 * Phone numbers, for a team that works in Qatar and messages the world.
 *
 * Three projects each kept their own country list — one generated, one
 * hand-typed, one a third shape — and all three needed the same two
 * answers: what does this number look like written down, and what digits
 * do I hand an API. That is all this is.
 */
/**
 * The countries the team actually reaches — the Gulf, the Levant, the
 * places staff and clients come from, and the markets worked in. Not the
 * whole world: a picker nobody can scroll is worse than a short list, and
 * `parse` still accepts any number it is given.
 */
export const COUNTRIES = [
    { iso: "QA", dial: "974", name: "Qatar" },
    { iso: "AE", dial: "971", name: "United Arab Emirates" },
    { iso: "SA", dial: "966", name: "Saudi Arabia" },
    { iso: "KW", dial: "965", name: "Kuwait" },
    { iso: "BH", dial: "973", name: "Bahrain" },
    { iso: "OM", dial: "968", name: "Oman" },
    { iso: "EG", dial: "20", name: "Egypt" },
    { iso: "JO", dial: "962", name: "Jordan" },
    { iso: "LB", dial: "961", name: "Lebanon" },
    { iso: "SY", dial: "963", name: "Syria" },
    { iso: "IQ", dial: "964", name: "Iraq" },
    { iso: "PS", dial: "970", name: "Palestine" },
    { iso: "YE", dial: "967", name: "Yemen" },
    { iso: "SD", dial: "249", name: "Sudan" },
    { iso: "TN", dial: "216", name: "Tunisia" },
    { iso: "DZ", dial: "213", name: "Algeria" },
    { iso: "MA", dial: "212", name: "Morocco" },
    { iso: "LY", dial: "218", name: "Libya" },
    { iso: "IN", dial: "91", name: "India" },
    { iso: "PK", dial: "92", name: "Pakistan" },
    { iso: "BD", dial: "880", name: "Bangladesh" },
    { iso: "LK", dial: "94", name: "Sri Lanka" },
    { iso: "NP", dial: "977", name: "Nepal" },
    { iso: "PH", dial: "63", name: "Philippines" },
    { iso: "ID", dial: "62", name: "Indonesia" },
    { iso: "TR", dial: "90", name: "Türkiye" },
    { iso: "GB", dial: "44", name: "United Kingdom" },
    { iso: "US", dial: "1", name: "United States" },
    { iso: "FR", dial: "33", name: "France" },
    { iso: "DE", dial: "49", name: "Germany" },
];
export const DEFAULT_COUNTRY = "QA";
/** Everything an API wants: digits with a country code, nothing else. */
export function digits(phone) {
    return phone.replace(/\D/g, "");
}
/**
 * Splits a stored number back into a country and the national part, so a
 * form can show a flag beside the digits somebody actually typed.
 * Longest dial code wins — 974 must beat 97 and 9.
 */
export function parse(phone) {
    const all = digits(phone);
    if (!all)
        return null;
    const match = [...COUNTRIES]
        .sort((a, b) => b.dial.length - a.dial.length)
        .find((country) => all.startsWith(country.dial));
    if (!match)
        return null;
    return { country: match, national: all.slice(match.dial.length) };
}
/** "+974 5036 8805" — how a number is written down for a human. */
export function format(phone) {
    const parsed = parse(phone);
    if (!parsed) {
        const all = digits(phone);
        return all ? `+${all}` : "";
    }
    const { country, national } = parsed;
    // Qatar's eight digits read as two fours; everything else stays whole
    // rather than guessing a grouping the country does not use.
    const grouped = country.iso === "QA" && national.length === 8
        ? `${national.slice(0, 4)} ${national.slice(4)}`
        : national;
    return `+${country.dial} ${grouped}`.trim();
}
/** A wa.me link, which needs bare digits. */
export function whatsappLink(phone, text) {
    const base = `https://wa.me/${digits(phone)}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
