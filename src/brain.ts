/**
 * The brain — what Socialize knows about the client an app runs for: house
 * rules, facts, voice, words never said, staff names as spelled, answers.
 * It is kept once, in HQ's Brain room, and every writer that speaks for the
 * client reads it from there: the AI hostess, the review replies, the bots.
 * One brain per client, never shared: the app's key opens its own client's
 * brain and no other (Damine, 29 September 2026: "unified brain").
 *
 * The same key as `notify`. Config is passed in; never throws: a brain that
 * cannot be read leaves the app on what it knew, and says so in `error`.
 */

export interface BrainConfig {
  /** The app's key from HQ, the one `notify` uses. */
  key: string;
  /** HQ's door; the live one unless a test points elsewhere. */
  url?: string;
  timeoutMs?: number;
}

export interface BrainLine {
  kind: "rule" | "fact" | "voice" | "never" | "staff" | "answer";
  body: string;
  /** Only for this branch or location; null for all. */
  branch: string | null;
  updatedAt: string;
}

export interface BrainResult {
  ok: boolean;
  /** The brain as one text, ready for a system prompt: the file's facts, then the lines. */
  text?: string;
  lines?: BrainLine[];
  /** When the newest line changed, so an app can keep a copy until it moves. */
  updatedAt?: string | null;
  error?: string;
}

export const BRAIN_URL = "https://socialize.qa/api/brain";

/** The client's brain, for one branch when named (its own lines plus the whole client's). */
export async function readBrain(config: BrainConfig, options: { branch?: string } = {}): Promise<BrainResult> {
  if (!config.key) return { ok: false, error: "No hub key." };
  const url = new URL(config.url ?? BRAIN_URL);
  if (options.branch) url.searchParams.set("branch", options.branch);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(config.timeoutMs ?? 6000),
    });
    const body = (await response.json().catch(() => null)) as (BrainResult & { ok?: boolean }) | null;
    if (!response.ok || !body?.ok) return { ok: false, error: body?.error ?? `HQ answered ${response.status}.` };
    return { ok: true, text: body.text ?? "", lines: body.lines ?? [], updatedAt: body.updatedAt ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
