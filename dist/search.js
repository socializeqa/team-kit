/**
 * Telling Google a job page is new, changed or gone, the moment it happens,
 * instead of waiting for the next crawl (Google's Indexing API). The robot
 * that may do it belongs to HQ and its key never leaves HQ: an app asks with
 * its hub key, and HQ pings only addresses on that app's own domain.
 *
 * Google takes these pings for pages carrying `JobPosting` (or a livestream's
 * `BroadcastEvent`) and for nothing else, and gives the whole house 200 a
 * day, a "gone" included (developers.google.com/search/apis/indexing-api).
 * So: an opening that opens, changes or closes, in each language it has, and
 * never a sweep of the site. Config is passed in; nothing here throws.
 */
import { callHq } from "./hq.js";
/** At most this many addresses in one ask: one opening in every language, twice over. */
export const MAX_URLS = 12;
export const SEARCH_URL = "https://socialize.qa/api/search-ping";
/** Ask Google to read these pages again, or to drop them when `gone`. */
export async function pingGoogle(config, ask) {
    const urls = [...new Set(ask.urls)];
    if (!urls.length)
        return { ok: true, pinged: [] };
    if (urls.length > MAX_URLS)
        return { ok: false, error: `At most ${MAX_URLS} addresses at a time.` };
    return callHq(config.url ?? SEARCH_URL, config.key, { method: "POST", body: JSON.stringify({ urls, gone: Boolean(ask.gone) }) }, config.timeoutMs ?? 15_000);
}
