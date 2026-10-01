/**
 * Money, for a team that bills in Qatari Riyals.
 *
 * Amounts are handled as numbers of riyals, rounded to two places at every
 * boundary — the documents are small enough that a float never drifts, and
 * every total the client sees is recomputed rather than stored.
 */

/** Two decimal places, no floating-point tail. */
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** "QAR 1,250.00" — what a paper prints. */
export function formatQAR(amount: number): string {
  return `QAR ${round2(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "1,250.00" — for a column that already says which currency it is. */
export function formatAmount(amount: number): string {
  return round2(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
] as const;

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
] as const;

function underThousand(value: number): string {
  if (value === 0) return "";
  if (value < 20) return ONES[value] ?? "";
  if (value < 100) {
    const tens = TENS[Math.floor(value / 10)] ?? "";
    const rest = ONES[value % 10] ?? "";
    return rest ? `${tens} ${rest}` : tens;
  }
  const hundreds = `${ONES[Math.floor(value / 100)]} Hundred`;
  const rest = underThousand(value % 100);
  return rest ? `${hundreds} ${rest}` : hundreds;
}

/**
 * The amount in words, the way a receipt says it out loud:
 * "Qatari Riyals One Thousand Two Hundred Fifty Only" for 1250.
 *
 * A paper that carries both the figure and the words is much harder to
 * alter after signing, which is the whole reason receipts do this.
 */
export function qarInWords(amount: number): string {
  const whole = Math.floor(round2(Math.abs(amount)));
  // The Qatari riyal is 100 dirhams (not fils, which is other currencies).
  const dirhams = Math.round((round2(Math.abs(amount)) - whole) * 100);

  if (whole === 0 && dirhams === 0) return "Qatari Riyals Zero Only";

  const groups: string[] = [];
  let rest = whole;
  for (const [size, name] of [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ] as const) {
    const count = Math.floor(rest / size);
    if (count > 0) {
      groups.push(`${underThousand(count)} ${name}`);
      rest -= count * size;
    }
  }
  if (rest > 0) groups.push(underThousand(rest));

  const words = groups.join(" ").replace(/\s+/g, " ").trim();
  const dirhamsPart = dirhams > 0 ? ` and ${underThousand(dirhams)} Dirhams` : "";
  const sign = amount < 0 ? "Minus " : "";
  return `${sign}Qatari Riyals ${words || "Zero"}${dirhamsPart} Only`;
}

// The counting words for a masculine noun (ريال, درهم, ألف, مليون are all
// masculine), so three to ten take the form ending in ة: ثلاثة آلاف.
const AR_UNITS = [
  "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
] as const;
const AR_TEENS = [
  "", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر",
  "سبعة عشر", "ثمانية عشر", "تسعة عشر",
] as const;
const AR_TENS = [
  "", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون",
] as const;
const AR_HUNDREDS = [
  "", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة",
  "ثمانمائة", "تسعمائة",
] as const;

/** 1 to 999, the way a number counts a masculine noun. */
function arUnderThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) parts.push(AR_HUNDREDS[hundreds] ?? "");
  if (rest > 0 && rest <= 10) parts.push(AR_UNITS[rest] ?? "");
  else if (rest > 10 && rest < 20) parts.push(AR_TEENS[rest - 10] ?? "");
  else if (rest >= 20) {
    const unit = rest % 10;
    const tens = AR_TENS[Math.floor(rest / 10)] ?? "";
    // The unit comes first in Arabic: خمسة وعشرون.
    parts.push(unit ? `${AR_UNITS[unit]} و${tens}` : tens);
  }
  return parts.join(" و");
}

/**
 * A dual that a noun follows loses its ن: مائتان → مائتا ألف, ألفان → ألفا ريال.
 */
function construct(words: string): string {
  return words.replace(/(مائتان|ألفان|مليونان|ملياران)$/, (dual) => dual.slice(0, -1));
}

/** How many thousands (or millions…), as Arabic says it before what follows. */
function arScale(count: number, noun: { one: string; two: string; plural: string }, last: boolean): string {
  if (count === 1) return noun.one;
  if (count === 2) return noun.two;
  const tail = count % 100;
  const counted = construct(arUnderThousand(count));
  if (tail >= 3 && tail <= 10) return `${counted} ${noun.plural}`;
  // Eleven and up count with the singular, accusative unless the riyal follows.
  if (tail >= 11) return `${counted} ${noun.one}${last ? "" : "اً"}`;
  return `${counted} ${noun.one}`;
}

/** The counted noun after a whole number: ريال واحد, ريالان, ريالات, ريالاً. */
function arCounted(
  amount: number,
  words: string,
  forms: { one: string; two: string; few: string; many: string; round: string },
): string {
  if (amount === 1) return forms.one;
  if (amount === 2) return forms.two;
  const tail = amount % 100;
  if (tail >= 3 && tail <= 10) return `${words} ${forms.few}`;
  if (tail >= 11) return `${words} ${forms.many}`;
  return `${construct(words)} ${forms.round}`;
}

/**
 * The amount in Arabic words, the counterpart of `qarInWords` on a
 * bilingual paper: "فقط ألف ومائتان وخمسون ريالاً قطرياً لا غير" for 1250.
 *
 * Arabic changes the noun with the number (ريال واحد, ريالان, ثلاثة ريالات,
 * أحد عشر ريالاً, مائة ريال) and a dual followed by a noun drops its ن
 * (ألفا ريال, مائتا ألف), so the words are built with the currency rather
 * than having it appended. Hundreds are spelled مائة, the way Qatari bank
 * papers print them.
 */
export function qarInWordsAr(amount: number): string {
  const whole = Math.floor(round2(Math.abs(amount)));
  const dirhams = Math.round((round2(Math.abs(amount)) - whole) * 100);
  const sign = amount < 0 ? "سالب " : "";

  const groups: string[] = [];
  let rest = whole;
  for (const [size, noun] of [
    [1_000_000_000, { one: "مليار", two: "ملياران", plural: "مليارات" }],
    [1_000_000, { one: "مليون", two: "مليونان", plural: "ملايين" }],
    [1_000, { one: "ألف", two: "ألفان", plural: "آلاف" }],
  ] as const) {
    const count = Math.floor(rest / size);
    rest -= count * size;
    if (count > 0) groups.push(arScale(count, noun, rest === 0));
  }
  if (rest > 0) groups.push(arUnderThousand(rest));

  const riyals = whole
    ? arCounted(whole, groups.join(" و"), {
        one: "ريال قطري واحد",
        two: "ريالان قطريان",
        few: "ريالات قطرية",
        many: "ريالاً قطرياً",
        round: "ريال قطري",
      })
    : "";
  // Beside riyals the dirham is plainly Qatar's; alone, a درهم on a Doha
  // paper can be read as the UAE coin, so it names its country.
  const qatari = whole === 0;
  const dirhamWords = dirhams
    ? arCounted(dirhams, arUnderThousand(dirhams), {
        one: qatari ? "درهم قطري واحد" : "درهم واحد",
        two: qatari ? "درهمان قطريان" : "درهمان",
        few: qatari ? "دراهم قطرية" : "دراهم",
        many: qatari ? "درهماً قطرياً" : "درهماً",
        round: qatari ? "درهم قطري" : "درهم",
      })
    : "";

  const said = [riyals, dirhamWords].filter(Boolean).join(" و") || "صفر ريال قطري";
  return `فقط ${sign}${said} لا غير`;
}

/** A line's own total, before any document-level discount. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}
