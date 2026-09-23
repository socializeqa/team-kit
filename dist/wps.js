import { round2 } from "./money.js";
/**
 * The bank's own four letters inside a Qatari IBAN, and the short name the
 * wage system knows it by. The spec's list is from 2015: a bank born of a
 * merger since (Dukhan) needs its code confirmed with the bank and added.
 */
const WPS_BANK_BY_IBAN_LETTERS = {
    QNBA: "QNB",
    CBQA: "CBQ",
    DOHB: "DBQ",
    QISB: "QIB",
    ABQQ: "ABQ",
    QIIB: "IIB",
    ARAB: "ARB",
    MSHQ: "MSQ",
    IBOQ: "IBQ",
    BBME: "HSB",
    SCBL: "SCB",
    UNIL: "UBL",
    BNPA: "BNP",
    MAFR: "MAR",
    KLJI: "KCB",
    BRWA: "BBQ",
    QIDB: "QDB",
    BSIR: "BSI",
};
export const cleanIban = (raw) => raw.replace(/\s+/g, "").toUpperCase();
export function bankCodeFromIban(raw) {
    return WPS_BANK_BY_IBAN_LETTERS[cleanIban(raw).slice(4, 8)] ?? null;
}
/** Twenty-nine characters, QA, and the mod-97 check every IBAN carries. */
export function qatariIbanValid(raw) {
    const iban = cleanIban(raw);
    if (!/^QA\d{2}[A-Z]{4}[A-Z0-9]{21}$/.test(iban))
        return false;
    let remainder = 0;
    for (const char of iban.slice(4) + iban.slice(0, 4)) {
        const piece = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
        for (const digit of piece) {
            remainder = (remainder * 10 + Number(digit)) % 97;
        }
    }
    return remainder === 1;
}
/** Doha's clock, in the two shapes the header wants. */
export function dohaStamp(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Qatar",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).formatToParts(now);
    const part = (type) => parts.find((p) => p.type === type)?.value ?? "";
    return {
        date: part("year") + part("month") + part("day"),
        time: part("hour") + part("minute"),
    };
}
const digits = (value, count) => new RegExp(`^\\d{${count}}$`).test(value);
const bankCode = (value) => /^[A-Z]{1,4}$/.test(value);
const money = (value) => round2(value).toFixed(2);
const recordId = (index) => String(index + 1).padStart(6, "0");
/** The one CSV rule the spec states: a value holding a comma is quoted. */
const field = (value) => value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value;
/**
 * Everything that would make the bank refuse the file, each line naming
 * the seat it is about. Empty means the file may go.
 */
export function wpsFaults({ header, records }) {
    const faults = [];
    const need = (ok, fault) => {
        if (!ok)
            faults.push(fault);
    };
    need(digits(header.employerEid, 8), "The employer id must be the establishment card's 8 digits.");
    need(digits(header.createdDate, 8) && digits(header.createdTime, 4), "The file needs its creation date and time.");
    need(Boolean(header.payerEid) !== Boolean(header.payerQid), "The payer is either the establishment or a person — one of the two.");
    need(!header.payerEid || digits(header.payerEid, 8), "The payer's establishment id must be 8 digits.");
    need(!header.payerQid || digits(header.payerQid, 11), "The payer's QID must be 11 digits.");
    need(bankCode(header.payerBank), "The paying bank has no WPS code — is its IBAN a Qatari one?");
    need(qatariIbanValid(header.payerIban), "The paying account's IBAN doesn't check out.");
    need(/^\d{4}(0[1-9]|1[0-2])$/.test(header.salaryMonth), "The salary month must read yyyyMM.");
    need(records.length > 0, "The file has nobody in it.");
    for (const line of records) {
        const who = line.name || "An unnamed seat";
        need(digits(line.qid, 11) ||
            (line.visaId.length > 0 && line.visaId.length <= 12), `${who} needs an 11-digit QID, or a visa id until it comes.`);
        need(line.name.length > 0 && line.name.length <= 70, `${who} needs a name as written on the QID card, under 70 characters.`);
        need(bankCode(line.bank), `${who} needs a WPS bank code — a Qatari IBAN gives it, otherwise write it on the seat.`);
        need(line.account.length > 0 && line.account.length <= 29, `${who} needs an IBAN on the seat.`);
        need(!line.account.startsWith("QA") || qatariIbanValid(line.account), `${who}'s IBAN doesn't check out — read it again from the card.`);
        need(Number.isInteger(line.workingDays) &&
            line.workingDays >= 0 &&
            line.workingDays <= 999, `${who}'s days worked must be a whole number.`);
        need([line.net, line.basic, line.extraIncome, line.deductions].every((value) => Number.isFinite(value) && value >= 0), `${who}'s month runs below zero — reopen the payslip.`);
        need(line.extraHours >= 0 && line.extraHours < 1000, `${who}'s extra hours must be under 1000.`);
        need(line.notes.length <= 300, `${who}'s note runs past 300 characters.`);
    }
    return faults;
}
export const wpsTotal = (records) => round2(records.reduce((sum, line) => sum + line.net, 0));
/** Doha Bank keeps QAR 50 for every salary it pays through a WPS file. */
const WPS_FEE_PER_TRANSFER = 50;
export const wpsFee = (records) => WPS_FEE_PER_TRANSFER * records;
/** SIF_<employer>_<bank>_<date>_<time>.csv — every part copied from row 2. */
export function wpsFileName({ employerEid, payerBank, createdDate, createdTime, }) {
    return `SIF_${employerEid}_${payerBank}_${createdDate}_${createdTime}.csv`;
}
const HEADER_TITLES = "Employer EID,File Creation Date,File Creation Time,Payer EID,Payer QID,Payer Bank Short Name,Payer IBAN,Salary Year and Month,Total Salaries,Total records,,,,,";
const RECORD_TITLES = "Record ID,Employee QID,Employee Visa ID,Employee Name,Employee Bank Short Name,Employee Account,Salary Frequency,Number of Working Days,Net Salary,Basic Salary,Extra hours,Extra Income,Deductions,Payment Type,Notes / Comments";
/** The CSV, CRLF-ended, plain ASCII, laid out exactly as the bank's sample. */
export function renderWps({ header, records }) {
    const values = [
        header.employerEid,
        header.createdDate,
        header.createdTime,
        header.payerEid,
        header.payerQid,
        header.payerBank,
        header.payerIban,
        header.salaryMonth,
        money(wpsTotal(records)),
        String(records.length),
    ];
    const rows = records.map((line, index) => [
        recordId(index),
        line.qid,
        line.visaId,
        field(line.name),
        line.bank,
        line.account,
        line.frequency,
        String(line.workingDays),
        money(line.net),
        money(line.basic),
        money(line.extraHours),
        money(line.extraIncome),
        money(line.deductions),
        line.paymentType,
        field(line.notes),
    ].join(","));
    // The two header rows carry five empty fields so every row is fifteen wide.
    return ([HEADER_TITLES, `${values.join(",")},,,,,`, RECORD_TITLES, ...rows].join("\r\n") + "\r\n");
}
