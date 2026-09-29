/**
 * What a Sentry report must never carry, for every team app: cookies, and
 * the keys some addresses hold. A client's paper at /d/<token>, a customer's
 * tracker at /track/<token>, an invite link's ?code=: the address is the
 * key, and anyone who can read the Sentry project, or the Telegram room it
 * alerts, could replay it.
 *
 * The address travels in more places than `request.url`: the referer
 * header, a navigation breadcrumb, a span's description, an error message
 * that quotes the fetch it made. So every string in the event is walked,
 * not a chosen few, and a field the SDK adds tomorrow is covered today.
 *
 * Built from Socialize's scrubber (2 and 19 September 2026, and the fix of
 * 23 September), so each app keeps only its own list of keyed addresses
 * (29 September 2026). Wire it into every `Sentry.init`, client, server and
 * edge, as `beforeSend` and `beforeSendTransaction`.
 */
export interface ScrubRules {
    /** Paths whose next segment is a key: "/d/", "/portal/", "/track/". */
    paths?: readonly string[];
    /** Query parameters that carry a key: "code", "token", "token_hash". */
    query?: readonly string[];
    /** Hosts whose first path segment is a key, by their first label: "portal." */
    hosts?: readonly string[];
}
/** The one text with every key its rules name blanked. */
export declare function hideKeys(rules: ScrubRules, text: string): string;
/** A `beforeSend` that sends the event with no cookie and every key blanked, wherever it was written. */
export declare function scrubber(rules: ScrubRules): <Event extends object>(event: Event) => Event;
/**
 * True on a page whose address is itself a key, where no session replay is
 * recorded. A host rule counts the whole host, since a portal on its own
 * host has had its path prefix taken off.
 */
export declare function onKeyedPage(rules: ScrubRules, location: {
    hostname: string;
    pathname: string;
    search?: string;
}): boolean;
