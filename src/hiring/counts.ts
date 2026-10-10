/**
 * The counted spans in the letters: how long we take to answer ({reply}), how
 * long an offer stands ({offer}), and how long applications are kept
 * ({keep}). Each employer sets its own numbers, so the noun after the number
 * follows the language's plural rules (CLDR's, through Intl.PluralRules):
 * Arabic's six forms, Russian's three, and so on.
 *
 * Arabic writes every span as the plain genitive after "لمدة" (or "إلى").
 * Russian's {reply} follows "до", where only the "one" form is genitive
 * singular. French and Russian keep the number and its noun together with a
 * no-break space. Chinese has no spaces, so a span that starts with a digit
 * brings its own leading one.
 */

import { pluralOf, type Locale } from "./locale.js";

export type Span = "reply" | "offer" | "keep";

type Unit = "day" | "month";
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const UNIT: Record<Span, Unit> = { reply: "day", offer: "day", keep: "month" };

const NBSP = " ";

// "#" is the number. A form without one (Arabic's one and two) says the number in its noun.
const NOUNS: Record<Exclude<Locale, "ru" | "zh">, Record<Unit, Forms>> = {
  en: { day: { one: "# day", other: "# days" }, month: { one: "# month", other: "# months" } },
  fr: { day: { one: `#${NBSP}jour`, other: `#${NBSP}jours` }, month: { other: `#${NBSP}mois` } },
  it: { day: { one: "# giorno", other: "# giorni" }, month: { one: "# mese", other: "# mesi" } },
  ar: {
    day: { one: "يوم واحد", two: "يومين", few: "# أيام", many: "# يومًا", other: "# يوم" },
    month: { one: "شهر واحد", two: "شهرين", few: "# أشهر", many: "# شهرًا", other: "# شهر" },
  },
};

// Russian: after "до" ({reply}) the genitive, where only "one" is singular;
// elsewhere the accusative of a span ("действует 7 дней").
const RU_AFTER_DO: Record<Unit, Forms> = {
  day: { one: `#${NBSP}дня`, other: `#${NBSP}дней` },
  month: { one: `#${NBSP}месяца`, other: `#${NBSP}месяцев` },
};
const RU: Record<Unit, Forms> = {
  day: { one: `#${NBSP}день`, few: `#${NBSP}дня`, many: `#${NBSP}дней`, other: `#${NBSP}дня` },
  month: { one: `#${NBSP}месяц`, few: `#${NBSP}месяца`, many: `#${NBSP}месяцев`, other: `#${NBSP}месяца` },
};

function chinese(n: number, unit: Unit): string {
  if (unit === "month" && n === 1) return "一个月";
  if (unit === "month" && n === 2) return "两个月";
  return ` ${n} ${unit === "day" ? "天" : "个月"}`;
}

/** A span in a letter's language, ready for its slot. */
export function counted(n: number, span: Span, locale: Locale): string {
  const unit = UNIT[span];
  if (locale === "zh") return chinese(n, unit);
  const forms = locale === "ru" ? (span === "reply" ? RU_AFTER_DO : RU)[unit] : NOUNS[locale][unit];
  const form = forms[pluralOf(n, locale)] ?? forms.other;
  return form.replace("#", String(n));
}
