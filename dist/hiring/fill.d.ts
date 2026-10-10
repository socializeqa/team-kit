/**
 * The careers form starts with the CV: once it lands in storage, a model reads
 * the person's own details off it, so they check them instead of typing them.
 * The model's answer is checked field by field here before the form sees it;
 * what fails a check is simply left for the person to type.
 *
 * Zero dependencies: the app hands in how it reads a phone number (most use
 * libphonenumber-js), and which country codes it knows.
 */
import { type HqAiConfig } from "../ai.js";
/** What the model answers: every field present, an empty string or a zero where the CV does not say. */
export type RawFill = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    /** "1996-04-12", or "1996" when only the year is there. */
    birth_date: string;
    /** An age the CV states outright, when there is no birth date. */
    age: number;
    /** ISO 3166-1 alpha-2. */
    nationality: string;
};
/** A phone number as the form keeps it: its country, its dialling code, the rest. */
export type FillPhone = {
    iso: string;
    dial: string;
    national: string;
};
/** What the form takes from it: only what checks out, in the form's own shapes. */
export type Fill = {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: FillPhone;
    age?: string;
    nationality?: string;
};
export type FillChecks = {
    /** Reads a written number into its parts, or null when it is not a possible number. Numbers with no country code are the app's home country's. */
    toPhone: (raw: string) => FillPhone | null;
    /** Whether an ISO code names a country the app knows; by default, one the runtime can name. */
    isCountry?: (iso: string) => boolean;
};
export declare const FILL_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["first_name", "last_name", "email", "phone", "birth_date", "age", "nationality"];
    readonly properties: {
        readonly first_name: {
            readonly type: "string";
            readonly description: "Given name as written on the CV, or an empty string.";
        };
        readonly last_name: {
            readonly type: "string";
            readonly description: "Family name as written on the CV, or an empty string.";
        };
        readonly email: {
            readonly type: "string";
            readonly description: "The person's own email address, or an empty string.";
        };
        readonly phone: {
            readonly type: "string";
            readonly description: "The person's mobile number with its country code if shown (e.g. +44 20 7946 0018), or an empty string.";
        };
        readonly birth_date: {
            readonly type: "string";
            readonly description: "Date of birth as YYYY-MM-DD, or YYYY when only the year is shown, or an empty string.";
        };
        readonly age: {
            readonly type: "integer";
            readonly description: "An age the CV states outright when there is no date of birth, otherwise 0.";
        };
        readonly nationality: {
            readonly type: "string";
            readonly description: "Nationality as an ISO 3166-1 alpha-2 code (e.g. LB, IN, QA), or an empty string. Never guess it from a name or a place of work.";
        };
    };
};
export declare const FILL_SYSTEM = "You read a CV and copy the applicant's own details off it for a job application form. Copy only what the CV states about the applicant; never guess, never infer from a name, a photo or where they worked, and never take a referee's or an employer's details. Leave a field empty when the CV does not say.";
/** The model's read, checked field by field. */
export declare function cleanFill(raw: RawFill, today: Date, checks: FillChecks): Fill;
/**
 * Reads a CV through Socialize HQ (billed to the app's client as "CV form
 * fill"): the quick model first, the careful one if it fails. `url` is a
 * short-lived signed link to the PDF. Null when nothing came back; the form
 * then simply asks.
 */
export declare function readCvFill(hq: HqAiConfig, { url, today, models, ...checks }: {
    url: string;
    today?: Date;
    models?: readonly string[];
} & FillChecks): Promise<Fill | null>;
