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
import { type Locale } from "./locale.js";
export type Span = "reply" | "offer" | "keep";
/** A span in a letter's language, ready for its slot. */
export declare function counted(n: number, span: Span, locale: Locale): string;
