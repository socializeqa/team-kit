/**
 * Why a careers door (the upload, the CV read, the application) says no, as a
 * code the form words in the reader's own language. The server never sends a
 * sentence: a door that answered in English answered every page in English,
 * and a thrown fetch once showed "Failed to fetch" to an applicant. One list,
 * read by the doors and the form, so they never drift apart.
 */
import { type Locale } from "./locale.js";
export declare const CAREERS_FAULTS: readonly ["busy", "fields", "age", "yesno", "phone", "link", "file", "cv", "lost", "answers", "closed", "broken"];
export type CareersFault = (typeof CAREERS_FAULTS)[number];
/** What a door answers when it refuses. */
export type CareersRefusal = {
    error: CareersFault;
    wait?: number;
};
/** A fault the form words: the doors' own, and a connection lost before any door answered. */
export type FaultWord = CareersFault | "network";
export declare function isCareersFault(value: unknown): value is CareersFault;
/** Whole minutes to wait, at least one. */
export declare function waitMinutes(seconds: number | undefined): number;
/**
 * The form's words for each fault. English and Arabic are whole; the other
 * languages have every line but the yes/no one, which falls back to English
 * until it is translated.
 */
export declare const FAULT_WORDS: Record<Locale, Partial<Record<FaultWord, string>>>;
/**
 * A fault as the reader is told it. `minutes` fills the wait of `busy`
 * (waitMinutes of the door's `wait`); `age` the bounds the door checked.
 */
export declare function faultWords(fault: FaultWord, locale?: Locale, { minutes, age }?: {
    minutes?: number;
    age?: {
        min: number;
        max: number;
    };
}): string;
