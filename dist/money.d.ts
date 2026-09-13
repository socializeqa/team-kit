/**
 * Money, for a team that bills in Qatari Riyals.
 *
 * Amounts are handled as numbers of riyals, rounded to two places at every
 * boundary — the documents are small enough that a float never drifts, and
 * every total the client sees is recomputed rather than stored.
 */
/** Two decimal places, no floating-point tail. */
export declare function round2(amount: number): number;
/** "QAR 1,250.00" — what a paper prints. */
export declare function formatQAR(amount: number): string;
/** "1,250.00" — for a column that already says which currency it is. */
export declare function formatAmount(amount: number): string;
/**
 * The amount in words, the way a receipt says it out loud:
 * "Qatari Riyals One Thousand Two Hundred Fifty Only" for 1250.
 *
 * A paper that carries both the figure and the words is much harder to
 * alter after signing, which is the whole reason receipts do this.
 */
export declare function qarInWords(amount: number): string;
/** A line's own total, before any document-level discount. */
export declare function lineTotal(quantity: number, unitPrice: number): number;
