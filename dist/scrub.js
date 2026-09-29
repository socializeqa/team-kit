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
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Longest first, so "/d/plan/" wins over "/d/".
const either = (items) => [...items].sort((a, b) => b.length - a.length).map(escape).join("|");
/** The one text with every key its rules name blanked. */
export function hideKeys(rules, text) {
    let out = text;
    if (rules.paths?.length)
        out = out.replace(new RegExp(`(${either(rules.paths)})[^/?#\\s"']+`, "g"), "$1[secret]");
    if (rules.hosts?.length)
        out = out.replace(new RegExp(`(https?:\\/\\/(?:${either(rules.hosts)})[^/\\s"']+\\/)[^/?#\\s"']+`, "gi"), "$1[secret]");
    if (rules.query?.length)
        out = out.replace(new RegExp(`([?&](?:${either(rules.query)})=)[^&#\\s"']+`, "gi"), "$1[secret]");
    return out;
}
/**
 * Only the event's own data is walked: arrays and plain objects, the shapes
 * the SDK serialises. An event also carries the SDK's working objects (a
 * promise buffer with a getter-only `$`, a browser Location), and writing
 * back into those threw on Socialize (about 750 events by 23 September 2026),
 * making the scrubber the error and losing the event it held. A value is
 * written back only when hiding changed it.
 */
function isPlain(value) {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
function walk(value, hide, seen) {
    if (typeof value === "string")
        return hide(value);
    if (!value || typeof value !== "object" || seen.has(value))
        return value;
    seen.add(value);
    if (Array.isArray(value)) {
        for (let at = 0; at < value.length; at++) {
            const next = walk(value[at], hide, seen);
            if (next !== value[at])
                value[at] = next;
        }
        return value;
    }
    if (!isPlain(value))
        return value;
    const record = value;
    for (const key of Object.keys(record)) {
        const next = walk(record[key], hide, seen);
        if (next === record[key])
            continue;
        const slot = Object.getOwnPropertyDescriptor(record, key);
        if (slot && "value" in slot && slot.writable)
            record[key] = next;
    }
    return value;
}
/**
 * Cookies never travel: `sendDefaultPii` puts them on server events, and a
 * session or a portal passport rides every request, so anyone reading the
 * project could walk in as the person who hit the error.
 */
function dropCookies(event) {
    const request = event.request;
    if (!request)
        return;
    delete request.cookies;
    for (const name of Object.keys(request.headers ?? {})) {
        if (name.toLowerCase() === "cookie")
            delete request.headers?.[name];
    }
}
/** A `beforeSend` that sends the event with no cookie and every key blanked, wherever it was written. */
export function scrubber(rules) {
    const hide = (text) => hideKeys(rules, text);
    return (event) => {
        dropCookies(event);
        const seen = new WeakSet();
        // The SDK's own bag of working objects is never sent, so never walked.
        const sdk = event.sdkProcessingMetadata;
        if (sdk && typeof sdk === "object")
            seen.add(sdk);
        walk(event, hide, seen);
        return event;
    };
}
/**
 * True on a page whose address is itself a key, where no session replay is
 * recorded. A host rule counts the whole host, since a portal on its own
 * host has had its path prefix taken off.
 */
export function onKeyedPage(rules, location) {
    if (rules.hosts?.some((host) => location.hostname.startsWith(host)))
        return true;
    if (rules.paths?.some((path) => location.pathname.startsWith(path)))
        return true;
    return Boolean(location.search && rules.query?.length && hideKeys({ query: rules.query }, location.search) !== location.search);
}
