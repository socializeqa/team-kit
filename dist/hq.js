/**
 * One call to an HQ door with the app's hub key. Never throws: a refusal, a
 * page that is not JSON or a lost line comes back as `ok: false` with HQ's
 * own words when it sent any, and the rest of what it sent beside them.
 */
export async function callHq(url, key, init, timeoutMs) {
    if (!key)
        return { ok: false, error: "No hub key." };
    try {
        const response = await fetch(url, {
            ...init,
            headers: { Authorization: `Bearer ${key}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
            signal: AbortSignal.timeout(timeoutMs),
        });
        const body = (await response.json().catch(() => null));
        if (!body)
            return { ok: false, error: `HQ answered ${response.status}.` };
        if (!response.ok || !body.ok)
            return { ...body, ok: false, error: body.error ?? `HQ answered ${response.status}.` };
        return body;
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
