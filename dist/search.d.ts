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
export interface SearchConfig {
    /** The app's key from HQ, the one `notify` uses. */
    key: string;
    /** HQ's door; the live one unless a test points elsewhere. */
    url?: string;
    timeoutMs?: number;
}
/** At most this many addresses in one ask: one opening in every language, twice over. */
export declare const MAX_URLS = 12;
export interface PingAsk {
    /** Full https addresses on the app's own domain. */
    urls: string[];
    /** The page is gone (it answers 404 or 410 now): Google drops it instead of reading it again. */
    gone?: boolean;
}
export interface Pinged {
    url: string;
    ok: boolean;
    error?: string;
}
export interface PingResult {
    ok: boolean;
    /** One line per address, whether Google took it or not. */
    pinged?: Pinged[];
    error?: string;
}
export declare const SEARCH_URL = "https://socialize.qa/api/search-ping";
/** Ask Google to read these pages again, or to drop them when `gone`. */
export declare function pingGoogle(config: SearchConfig, ask: PingAsk): Promise<PingResult>;
