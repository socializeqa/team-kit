import { describe, expect, it } from "vitest";
import { bankCodeFromIban, qatariIbanValid, renderWps, type WpsFile, wpsFaults, wpsFee, wpsFileName } from "./wps.js";

// Made-up employer, people and accounts; the IBANs pass the mod-97 check.
const FILE: WpsFile = {
  header: {
    employerEid: "17123456",
    createdDate: "20261001",
    createdTime: "1200",
    payerEid: "17123456",
    payerQid: "",
    payerBank: "DBQ",
    payerIban: "QA82DOHB000000000000000000123",
    salaryMonth: "202609",
  },
  records: [
    {
      qid: "28412345678",
      visaId: "",
      name: "Karim Ben Salah",
      bank: "QNB",
      account: "QA86QNBA000000000000000000456",
      frequency: "M",
      workingDays: 2,
      net: 360,
      basic: 360,
      extraHours: 0,
      extraIncome: 0,
      deductions: 0,
      paymentType: "Settlement Payment",
      notes: "3 classes",
    },
  ],
};

describe("the salary file", () => {
  it("reads a Qatari IBAN's bank and checks its digits", () => {
    expect(bankCodeFromIban("QA82 DOHB 0000 0000 0000 0000 0012 3")).toBe("DBQ");
    expect(qatariIbanValid("QA82DOHB000000000000000000123")).toBe(true);
    expect(qatariIbanValid("QA83DOHB000000000000000000123")).toBe(false);
  });

  it("passes a good file and names what would make the bank refuse a bad one", () => {
    expect(wpsFaults(FILE)).toEqual([]);
    const bad = { ...FILE, records: [{ ...FILE.records[0], qid: "", account: "" }] };
    expect(wpsFaults(bad).some((f) => f.startsWith("Karim Ben Salah needs an 11-digit QID"))).toBe(true);
    expect(wpsFaults(bad).some((f) => f.startsWith("Karim Ben Salah needs an IBAN"))).toBe(true);
  });

  it("renders the bank's layout: fifteen fields a row, CRLF, two decimals, named after row two", () => {
    const csv = renderWps(FILE);
    const rows = csv.split("\r\n");
    expect(rows[1]).toBe("17123456,20261001,1200,17123456,,DBQ,QA82DOHB000000000000000000123,202609,360.00,1,,,,,");
    expect(rows[3]).toBe("000001,28412345678,,Karim Ben Salah,QNB,QA86QNBA000000000000000000456,M,2,360.00,360.00,0.00,0.00,0.00,Settlement Payment,3 classes");
    expect(rows.slice(0, 4).every((r) => r.split(",").length === 15)).toBe(true);
    expect(wpsFileName(FILE.header)).toBe("SIF_17123456_DBQ_20261001_1200.csv");
    expect(wpsFee(3)).toBe(150);
  });
});
