/**
 * AI — the one way a team app talks to a model.
 *
 * Every call goes through OpenRouter, server-side, and asks for JSON against
 * a schema, so a model answering "about 450 riyals" never reaches a number
 * column. Nothing the app sends is kept or trained on: `data_collection:
 * deny` rules out providers that collect, `zdr` those that retain, and
 * `require_parameters` those that cannot honour the schema (they would answer
 * in prose, which reads here as a silent null; a loud refusal is better).
 *
 * The models are tried in order: the first that gives a clean answer wins,
 * which is how Señorritas' hostess kept answering when one provider failed.
 * Built from Socialize's `ai.ts` and Señorritas' `hostess/model.ts`, the two
 * that worked, so no app keeps its own copy again (29 September 2026).
 *
 * Config is passed in; the kit reads no environment. Never throws: a model
 * being slow, broken or switched off leaves the caller exactly as it was.
 *
 * Docs: openrouter.ai/docs/features/structured-outputs,
 *       openrouter.ai/docs/features/provider-routing
 */

export interface AiConfig {
  /** The app's OpenRouter key. */
  key: string;
  /** The kill switch: true turns every call off. */
  disabled?: boolean;
  /** How OpenRouter attributes the usage. */
  app?: { url: string; title: string };
  /** Hears a failed call (a refusal, a timeout): the app's report(). */
  onError?: (where: string, detail: string, context: { model: string; schemaName: string }) => void;
  /** Hears what each answered call cost, as OpenRouter reports it: how HQ
   *  meters a client's AI to bill it (30 September 2026). */
  onUsage?: (usage: AiUsage) => void | Promise<void>;
}

/** One call's bill. OpenRouter puts it on every answer; cost is in its
 *  credits, which are US dollars (openrouter.ai/docs/use-cases/usage-accounting). */
export interface AiUsage {
  model: string;
  schemaName: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** Whether the answer was clean JSON; a model can bill for an answer it botched. */
  ok: boolean;
}

/**
 * The house's three writers. Swapping one is a one-line change here, and
 * OpenRouter keeps the shape of the call the same. Read a model's endpoint
 * list (`/api/v1/models/<id>/endpoints`) for `structured_outputs` and
 * `temperature` before adding one: under zero retention some providers drop
 * out, and a Claude 5 model answered only in prose there (September 2026).
 */
export const MODELS = {
  /** Reads a paper or sorts a message: cheap and quick. */
  fast: "google/gemini-3.1-flash-lite",
  /** The steady second opinion, the screening, the short writing. */
  careful: "anthropic/claude-haiku-4.5",
  /** Words a client or a guest reads: the strongest that holds a schema. */
  writer: "anthropic/claude-sonnet-4.6",
} as const;

export interface AskJson {
  /** Tried in order until one answers cleanly. */
  models: readonly string[];
  system: string;
  prompt: string;
  /** A JSON schema for the answer, strict. */
  schema: Record<string, unknown>;
  schemaName?: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** Pictures sent with the prompt. */
  images?: readonly { mediaType: string; base64: string }[];
  /** PDFs sent whole: the model reads the page's layout, not scraped text.
   *  By link (a short-lived signed URL) when the file is large: a function
   *  takes 4.5 MB of body on Vercel, and a link is a few hundred bytes. */
  files?: readonly ({ filename: string; base64: string } | { filename: string; url: string })[];
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function aiReady(config: AiConfig): boolean {
  return Boolean(config.key) && !config.disabled;
}

/** One JSON answer from the first model that gives a clean one, or null. */
export async function askForJson<T>(config: AiConfig, ask: AskJson): Promise<T | null> {
  if (!aiReady(config)) return null;
  for (const model of ask.models) {
    const answer = await once<T>(config, model, ask);
    if (answer !== null) return answer;
  }
  return null;
}

async function once<T>(config: AiConfig, model: string, ask: AskJson): Promise<T | null> {
  const content: unknown[] = [{ type: "text", text: ask.prompt }];
  for (const image of ask.images ?? []) {
    content.push({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.base64}` } });
  }
  for (const file of ask.files ?? []) {
    const data = "url" in file ? file.url : `data:application/pdf;base64,${file.base64}`;
    content.push({ type: "file", file: { filename: file.filename, file_data: data } });
  }
  const context = { model, schemaName: ask.schemaName ?? "answer" };
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(ask.timeoutMs ?? 30_000),
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        ...(config.app ? { "HTTP-Referer": config.app.url, "X-Title": config.app.title } : {}),
      },
      body: JSON.stringify({
        model,
        provider: {
          data_collection: "deny",
          zdr: true,
          require_parameters: true,
          // Google's Claude endpoints list no structured outputs: they took
          // the schema as a hint and fenced half their answers in markdown.
          ...(model.startsWith("anthropic/") ? { ignore: ["google-vertex"] } : {}),
        },
        max_tokens: ask.maxTokens ?? 800,
        temperature: 0,
        messages: [
          { role: "system", content: ask.system },
          { role: "user", content },
        ],
        // The house models take a PDF natively, so it is billed as ordinary
        // tokens and the model sees the page rather than scraped text.
        ...(ask.files?.length ? { plugins: [{ id: "file-parser", pdf: { engine: "native" } }] } : {}),
        response_format: { type: "json_schema", json_schema: { name: context.schemaName, strict: true, schema: ask.schema } },
      }),
    });
    if (!response.ok) {
      config.onError?.(`ai ${model}`, `${response.status}: ${(await response.text()).slice(0, 400)}`, context);
      return null;
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number };
    };
    const text = body.choices?.[0]?.message?.content;
    let answer: T | null = null;
    if (typeof text === "string") {
      try {
        answer = JSON.parse(text) as T;
      } catch {
        config.onError?.(`ai ${model}`, "the answer was not JSON", context);
      }
    }
    try {
      // Awaited: on a serverless function a meter left running is cut off
      // the moment the answer goes back, and the call would go unbilled.
      await config.onUsage?.({
        ...context,
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
        costUsd: body.usage?.cost ?? 0,
        ok: answer !== null,
      });
    } catch (error) {
      // A meter that fails must not cost the caller its answer.
      config.onError?.("ai usage", error instanceof Error ? error.message : String(error), context);
    }
    return answer;
  } catch (error) {
    config.onError?.(`ai ${model}`, error instanceof Error ? error.message : String(error), context);
    return null;
  }
}

// ── Asking through Socialize ─────────────────────────────────────────────

export interface HqAiConfig {
  /** The app's hub key, the one `notify` and `readBrain` use. */
  key: string;
  /** HQ's door; the live one unless a test points elsewhere. */
  url?: string;
  timeoutMs?: number;
  /** Hears a refusal (a spending cap reached, a model not allowed). */
  onError?: (where: string, detail: string) => void;
}

export const HQ_AI_URL = "https://socialize.qa/api/ai";

/**
 * The same ask, made by Socialize HQ on its own OpenRouter account: the app
 * holds no AI key, and HQ records what each call cost against the app's
 * client, to bill it on their statement (Damine, 30 September 2026: "use ai
 * from socialize and then add their consumption in the bill"). `purpose`
 * names the line the call is billed under ("CV screening"). HQ answers only
 * with the house's models, within the client's monthly cap. Never throws.
 */
export async function askViaHq<T>(config: HqAiConfig, ask: AskJson & { purpose: string }): Promise<T | null> {
  if (!config.key) return null;
  try {
    const response = await fetch(config.url ?? HQ_AI_URL, {
      method: "POST",
      signal: AbortSignal.timeout(config.timeoutMs ?? 90_000),
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(ask),
    });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; answer?: T; error?: string } | null;
    if (!response.ok || !body?.ok) {
      config.onError?.("ai via hq", body?.error ?? `HQ answered ${response.status}`);
      return null;
    }
    return body.answer ?? null;
  } catch (error) {
    config.onError?.("ai via hq", error instanceof Error ? error.message : String(error));
    return null;
  }
}
