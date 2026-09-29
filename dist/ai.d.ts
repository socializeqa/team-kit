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
    app?: {
        url: string;
        title: string;
    };
    /** Hears a failed call (a refusal, a timeout): the app's report(). */
    onError?: (where: string, detail: string, context: {
        model: string;
        schemaName: string;
    }) => void;
}
/**
 * The house's three writers. Swapping one is a one-line change here, and
 * OpenRouter keeps the shape of the call the same. Read a model's endpoint
 * list (`/api/v1/models/<id>/endpoints`) for `structured_outputs` and
 * `temperature` before adding one: under zero retention some providers drop
 * out, and a Claude 5 model answered only in prose there (September 2026).
 */
export declare const MODELS: {
    /** Reads a paper or sorts a message: cheap and quick. */
    readonly fast: "google/gemini-3.1-flash-lite";
    /** The steady second opinion, the screening, the short writing. */
    readonly careful: "anthropic/claude-haiku-4.5";
    /** Words a client or a guest reads: the strongest that holds a schema. */
    readonly writer: "anthropic/claude-sonnet-4.6";
};
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
    images?: readonly {
        mediaType: string;
        base64: string;
    }[];
    /** PDFs sent whole: the model reads the page's layout, not scraped text. */
    files?: readonly {
        filename: string;
        base64: string;
    }[];
}
export declare function aiReady(config: AiConfig): boolean;
/** One JSON answer from the first model that gives a clean one, or null. */
export declare function askForJson<T>(config: AiConfig, ask: AskJson): Promise<T | null>;
