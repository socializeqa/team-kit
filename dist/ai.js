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
};
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export function aiReady(config) {
    return Boolean(config.key) && !config.disabled;
}
/** One JSON answer from the first model that gives a clean one, or null. */
export async function askForJson(config, ask) {
    if (!aiReady(config))
        return null;
    for (const model of ask.models) {
        const answer = await once(config, model, ask);
        if (answer !== null)
            return answer;
    }
    return null;
}
async function once(config, model, ask) {
    const content = [{ type: "text", text: ask.prompt }];
    for (const image of ask.images ?? []) {
        content.push({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.base64}` } });
    }
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
                response_format: { type: "json_schema", json_schema: { name: ask.schemaName ?? "answer", strict: true, schema: ask.schema } },
            }),
        });
        if (!response.ok) {
            config.onError?.(`ai ${model}`, `${response.status}: ${(await response.text()).slice(0, 400)}`);
            return null;
        }
        const body = (await response.json());
        const text = body.choices?.[0]?.message?.content;
        if (typeof text !== "string")
            return null;
        return JSON.parse(text);
    }
    catch (error) {
        config.onError?.(`ai ${model}`, error instanceof Error ? error.message : String(error));
        return null;
    }
}
