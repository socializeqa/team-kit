/**
 * The candidates list as a spreadsheet, to share a shortlist. Excel opens it
 * as UTF-8 thanks to the mark at its head, so Arabic names stay right. A cell
 * that starts like a formula is written as text: a candidate's own words must
 * never run as one in the office's spreadsheet.
 */

export type CsvColumn<Row> = { header: string; value: (row: Row) => string | number | boolean | null | undefined };

export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function candidatesCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string {
  const lines = [columns.map((column) => csvCell(column.header)).join(","), ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
