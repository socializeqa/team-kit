/**
 * Qatar's Wage Protection System: the Salary Information File a bank reads
 * to pay every employee, and the ministry reads to check that it did.
 *
 * One copy for the team (the wps-sif skill holds the bank's spec, the
 * Node checker beside it). Doha Bank's spec is exacting in the ways a
 * spreadsheet quietly breaks: Record IDs keep their leading zeros, every
 * riyal shows two decimals, the file is named after its own header, and a
 * row is always fifteen fields wide. So the file is rendered here from
 * typed values and read through the same checks before it leaves.
 */
export type WpsHeader = {
    /** The establishment card number: eight digits, a seven-digit card padded with a zero. */
    employerEid: string;
    /** yyyyMMdd and hhmm, Doha time; the file is named after them. */
    createdDate: string;
    createdTime: string;
    /** Whose account is debited: the establishment, or a person by QID. One of the two. */
    payerEid: string;
    payerQid: string;
    payerBank: string;
    payerIban: string;
    /** yyyyMM */
    salaryMonth: string;
};
export type WpsPaymentType = "Settlement Payment" | "Partial Payment" | "Delayed Payment";
export type WpsRecord = {
    /** Eleven digits, or a visa id until the card comes. */
    qid: string;
    visaId: string;
    name: string;
    bank: string;
    account: string;
    frequency: "M" | "B";
    workingDays: number;
    net: number;
    basic: number;
    extraHours: number;
    extraIncome: number;
    deductions: number;
    paymentType: WpsPaymentType;
    notes: string;
};
export type WpsFile = {
    header: WpsHeader;
    records: WpsRecord[];
};
export declare const cleanIban: (raw: string) => string;
export declare function bankCodeFromIban(raw: string): string | null;
/** Twenty-nine characters, QA, and the mod-97 check every IBAN carries. */
export declare function qatariIbanValid(raw: string): boolean;
/** Doha's clock, in the two shapes the header wants. */
export declare function dohaStamp(now?: Date): {
    date: string;
    time: string;
};
/**
 * Everything that would make the bank refuse the file, each line naming
 * the seat it is about. Empty means the file may go.
 */
export declare function wpsFaults({ header, records }: WpsFile): string[];
export declare const wpsTotal: (records: WpsRecord[]) => number;
export declare const wpsFee: (records: number) => number;
/** SIF_<employer>_<bank>_<date>_<time>.csv — every part copied from row 2. */
export declare function wpsFileName({ employerEid, payerBank, createdDate, createdTime, }: WpsHeader): string;
/** The CSV, CRLF-ended, plain ASCII, laid out exactly as the bank's sample. */
export declare function renderWps({ header, records }: WpsFile): string;
