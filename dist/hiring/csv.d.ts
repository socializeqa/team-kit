/**
 * The candidates list as a spreadsheet, to share a shortlist. Excel opens it
 * as UTF-8 thanks to the mark at its head, so Arabic names stay right. A cell
 * that starts like a formula is written as text: a candidate's own words must
 * never run as one in the office's spreadsheet.
 */
export type CsvColumn<Row> = {
    header: string;
    value: (row: Row) => string | number | boolean | null | undefined;
};
export declare function csvCell(value: string | number | boolean | null | undefined): string;
export declare function candidatesCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string;
