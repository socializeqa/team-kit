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
  const fils = Math.round((round2(Math.abs(amount)) - whole) * 100);

  if (whole === 0 && fils === 0) return "Qatari Riyals Zero Only";

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
  const filsPart = fils > 0 ? ` and ${underThousand(fils)} Fils` : "";
  const sign = amount < 0 ? "Minus " : "";
  return `${sign}Qatari Riyals ${words || "Zero"}${filsPart} Only`;
}

/** A line's own total, before any document-level discount. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}
