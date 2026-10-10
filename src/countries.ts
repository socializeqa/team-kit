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

export type CountryCode = { iso: string; dial: string };

/** A country as a picker shows it: its code, dialling code, its name in the reader's language and in English (what the panel stores). */
export type NamedCountry = CountryCode & { name: string; english: string };

/** Where the region list's official name is not the one a Gulf company uses. */
export const COUNTRY_NAME_FIXES: Record<string, Record<string, string>> = {
  PS: { en: "Palestine", ar: "فلسطين", fr: "Palestine", it: "Palestina", ru: "Палестина", zh: "巴勒斯坦" },
};

/** The names people still type that the official list no longer uses. */
export const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  TR: ["turkey"],
  CZ: ["czech republic"],
  NL: ["holland"],
  AE: ["uae", "emirates"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales"],
  US: ["usa", "america"],
  KR: ["korea", "south korea"],
  KP: ["north korea"],
  RU: ["russia"],
  IR: ["persia"],
  MM: ["burma"],
  CI: ["ivory coast"],
  CV: ["cape verde"],
  SZ: ["swaziland"],
  MK: ["macedonia"],
  CD: ["drc", "congo kinshasa"],
  CG: ["congo brazzaville"],
  VA: ["vatican"],
  SA: ["ksa"],
};

const namers = new Map<string, Intl.DisplayNames>();

/** A country's name in a language ("LB", "ar" → "لبنان"); the code itself when the runtime cannot name it. */
export function countryName(iso: string, locale: string): string {
  const code = iso.toUpperCase();
  const fixed = COUNTRY_NAME_FIXES[code]?.[locale];
  if (fixed) return fixed;
  let namer = namers.get(locale);
  if (!namer) {
    namer = new Intl.DisplayNames([locale], { type: "region" });
    namers.set(locale, namer);
  }
  try {
    return namer.of(code) ?? code;
  } catch {
    return code;
  }
}

/** The codes named in a language, the home country first and the rest in that language's alphabetical order. */
export function namedCountries(codes: readonly CountryCode[], locale: string, home = "QA"): NamedCountry[] {
  const collator = new Intl.Collator(locale);
  return codes
    .map((c) => ({ iso: c.iso.toUpperCase(), dial: c.dial, name: countryName(c.iso, locale), english: countryName(c.iso, "en") }))
    .sort((a, b) => (a.iso === home ? -1 : b.iso === home ? 1 : collator.compare(a.name, b.name)));
}

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

/** Does this country answer to what was typed: its name in either language, its code, an old name, or its dialling code? */
export function matchesCountry(country: NamedCountry, typed: string): boolean {
  const wanted = fold(typed.trim().replace(/^\+/, ""));
  if (!wanted) return true;
  if (/^\d+$/.test(wanted)) return country.dial.startsWith(wanted);
  return (
    fold(country.name).includes(wanted) ||
    fold(country.english).includes(wanted) ||
    country.iso.toLowerCase() === wanted ||
    (COUNTRY_ALIASES[country.iso] ?? []).some((alias) => alias.includes(wanted))
  );
}

/** The code of a country written by its English name, as a form stores it ("Lebanon" → "LB"); null when none matches. */
export function countryByName(name: string, countries: readonly NamedCountry[]): string | null {
  const wanted = fold(name.trim());
  if (!wanted) return null;
  return (countries.find((c) => fold(c.english) === wanted) ?? countries.find((c) => matchesCountry(c, name)))?.iso ?? null;
}
