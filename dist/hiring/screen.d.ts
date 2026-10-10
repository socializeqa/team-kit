/**
 * The first reader. Minutes after an application lands, a model reads the CV
 * as a document (layout, dates, employers) against the opening's own words and
 * suggests a fit score with a three-sentence verdict for the office. It
 * shortlists nobody and rejects nobody; it only says where to look first.
 *
 * The call goes through Socialize HQ (billed to the app's client as "CV
 * screening"). The app loads the application, signs short-lived links to its
 * papers and saves the result; this writes the question and checks the
 * answer. The reader sees what the person sent, never their age, gender or
 * nationality: those are the office's to weigh.
 */
import { type HqAiConfig } from "../ai.js";
export type ScreenOpening = {
    title: string;
    department: string | null;
    employment_type: string;
    location: string;
    summary: string;
    description: string;
    requirements: string | null;
    responsibilities: string | null;
    questions: unknown;
};
export type ScreenApplication = {
    name: string;
    portfolio_url: string | null;
    cover_note: string | null;
    answers: unknown;
};
export type Screening = {
    fit_score: number;
    verdict: string;
};
export declare const SCREEN_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["fit_score", "verdict"];
    readonly properties: {
        readonly fit_score: {
            readonly type: "integer";
            readonly minimum: 0;
            readonly maximum: 100;
            readonly description: "How well this applicant fits the role: 0 unrelated, 50 plausible, 80+ interview-worthy on paper.";
        };
        readonly verdict: {
            readonly type: "string";
            readonly description: "Three short sentences a colleague could have written: the strongest signal in what they sent, the real gap, and the one thing to ask them in an interview. Plain words. No dashes, no 'however', no hedging, no praise for its own sake. Say 'they', never 'the candidate'.";
        };
    };
};
/** The reader's standing orders, for an employer described in one sentence. */
export declare function screenSystem(org: string): string;
/** The question about one application. `today` is written out ("10 October 2026"): without it a model counts "to present" from its own training date. */
export declare function screenPrompt(opening: ScreenOpening, application: ScreenApplication, files: readonly {
    filename: string;
}[], today: string): string;
/** The answer made safe to save: a whole score from 0 to 100, and a verdict without dashes (the rules are in the prompt; this is the lock). */
export declare function cleanScreening(answer: unknown): Screening | null;
/** One application read and judged; null when HQ gave no answer or it did not fit. */
export declare function screenCandidate(hq: HqAiConfig, input: {
    org: string;
    opening: ScreenOpening;
    application: ScreenApplication;
    files: readonly {
        filename: string;
        url: string;
    }[];
    today: string;
    models?: readonly string[];
}): Promise<Screening | null>;
