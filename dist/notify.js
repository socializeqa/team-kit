/**
 * The Telegram hub's sender: tell Socialize HQ what happened, and HQ's one
 * bot says it to the people who run the business — our team, in the
 * project's topic of the team group, and the client's owners and staff, in
 * their own group (Damine, 29 September 2026: "only us and clients
 * telegram"). Guests and customers are never told this way: they stay on
 * WhatsApp.
 *
 * The app keeps one key, made in HQ's Settings → Telegram → Projects, and
 * passes it in; the kit reads no environment of its own. Never throws: a hub
 * that cannot be reached must not stop a booking from saving.
 */
export const HUB_URL = "https://socialize.qa/api/notify";
export async function notify(config, event) {
    if (!config.key)
        return { ok: false, error: "No hub key." };
    try {
        const response = await fetch(config.url ?? HUB_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(config.timeoutMs ?? 8000),
        });
        const body = (await response.json().catch(() => null));
        if (!response.ok || !body?.ok)
            return { ok: false, error: body?.error ?? `HQ answered ${response.status}.` };
        return { ok: true, sent: body.sent ?? 0, missing: body.missing ?? [] };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
