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

import { askViaHq, MODELS, type HqAiConfig } from "../ai.js";
import { employmentTypeLabel, type Answer, type Question } from "./openings.js";

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

export type Screening = { fit_score: number; verdict: string };

export const SCREEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fit_score", "verdict"],
  properties: {
    fit_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "How well this applicant fits the role: 0 unrelated, 50 plausible, 80+ interview-worthy on paper.",
    },
    verdict: {
      type: "string",
      description:
        "Three short sentences a colleague could have written: the strongest signal in what they sent, the real gap, and the one thing to ask them in an interview. Plain words. No dashes, no 'however', no hedging, no praise for its own sake. Say 'they', never 'the candidate'.",
    },
  },
} as const;

/** The reader's standing orders, for an employer described in one sentence. */
export function screenSystem(org: string): string {
  return `You screen job applications for ${org.trim().replace(/\.?$/, ".")} Judge only what is in front of you and never invent experience. Experience the CV shows, with employers, dates and places, counts for more than experience an answer claims; where the two disagree, say so. Write the way a careful colleague writes in the office file: short sentences, specific, plain. No dashes of any kind, no 'however' or 'moreover', no hedging, no generic praise. Refer to the person as 'they', never as 'the candidate'.`;
}

/** The question about one application. `today` is written out ("10 October 2026"): without it a model counts "to present" from its own training date. */
export function screenPrompt(opening: ScreenOpening, application: ScreenApplication, files: readonly { filename: string }[], today: string): string {
  // Each answer keeps the English prompt, whichever page it was asked on.
  const given = Array.isArray(application.answers) ? (application.answers as Answer[]) : [];
  const answers = given.map((entry) => `Q: ${entry.prompt}\nA: ${entry.answer}`).join("\n\n");
  // The form keeps only the questions answered; the blanks are worth knowing too.
  const answered = new Set(given.map((entry) => entry.prompt));
  const skipped = (Array.isArray(opening.questions) ? (opening.questions as Question[]) : [])
    .map((question) => question.prompt)
    .filter((prompt) => prompt && !answered.has(prompt));
  const about = [opening.department, employmentTypeLabel(opening.employment_type), opening.location].filter(Boolean).join(", ");

  return [
    `Today is ${today}.`,
    `The role: ${opening.title} (${about}). ${opening.summary}`,
    opening.description,
    opening.responsibilities ? `What they will do:\n${opening.responsibilities}` : null,
    opening.requirements ? `What we look for:\n${opening.requirements}` : null,
    `The applicant: ${application.name}`,
    application.portfolio_url ? `Portfolio link (unvisited, judge only its presence): ${application.portfolio_url}` : "No portfolio link given.",
    application.cover_note ? `Their note:\n${application.cover_note}` : null,
    answers ? `Screening answers:\n${answers}` : null,
    skipped.length ? `Questions they left blank:\n${skipped.join("\n")}` : null,
    files.length ? `Attached: ${files.map((file) => file.filename).join(", ")}.` : "No papers could be attached, so score from the written material alone.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The answer made safe to save: a whole score from 0 to 100, and a verdict without dashes (the rules are in the prompt; this is the lock). */
export function cleanScreening(answer: unknown): Screening | null {
  const a = answer as Partial<Screening> | null;
  if (!a || !Number.isFinite(a.fit_score) || typeof a.verdict !== "string" || !a.verdict.trim()) return null;
  return {
    fit_score: Math.max(0, Math.min(100, Math.round(a.fit_score as number))),
    verdict: a.verdict.replace(/\s*[—–]\s*/g, ", ").replace(/\s+,/g, ",").trim(),
  };
}

/** One application read and judged; null when HQ gave no answer or it did not fit. */
export async function screenCandidate(
  hq: HqAiConfig,
  input: { org: string; opening: ScreenOpening; application: ScreenApplication; files: readonly { filename: string; url: string }[]; today: string; models?: readonly string[] },
): Promise<Screening | null> {
  const answer = await askViaHq<Screening>(hq, {
    purpose: "CV screening",
    models: input.models ?? [MODELS.careful],
    system: screenSystem(input.org),
    prompt: screenPrompt(input.opening, input.application, input.files, input.today),
    schema: SCREEN_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "screening",
    maxTokens: 900,
    timeoutMs: 60_000,
    files: input.files,
  });
  return cleanScreening(answer);
}
