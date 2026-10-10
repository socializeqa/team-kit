/**
 * Where a visitor came from, kept for the office: the utm tags and click id
 * on the link they landed with, and the outside site that sent them. A public
 * form posts it with what the person sends; the panel says it in words
 * ("LinkedIn", "Instagram ad · hiring oct", "Direct").
 *
 * `rememberSource` and `visitSource` run in the browser (they read the
 * address and the tab's own storage); `readSource` and `sourceLabel` anywhere.
 */
export type VisitSource = Record<string, string>;
/**
 * In the browser, on the page a visit lands on: when its link carries tags,
 * keep them for the rest of the visit under `key`. An ad lands on one page and
 * the form may be sent from another, and a language switch drops the
 * address's tags; without this the office would read "Direct".
 */
export declare function rememberSource(key: string): void;
/** In the browser: where this visitor came from, from the address, then what the visit kept, then the referrer. */
export declare function visitSource(key: string): VisitSource;
/**
 * Where a visitor came from, as a public form posts it. Anything else in the
 * field is dropped, so a form cannot be used to store whatever a caller likes.
 */
export declare function readSource(raw: unknown): VisitSource | null;
/** Where a visitor came from, in words: the campaign, the site that sent them, or straight in. */
export declare function sourceLabel(source: VisitSource | null): string;
/** Meta's click id rebuilt from the link's fbclid, in the form its `_fbc` cookie takes. */
export declare function metaClickId(source: VisitSource | null): string | undefined;
