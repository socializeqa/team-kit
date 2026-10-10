/**
 * Where a visitor came from, kept for the office: the utm tags and click id
 * on the link they landed with, and the outside site that sent them. A public
 * form posts it with what the person sends; the panel says it in words
 * ("LinkedIn", "Instagram ad · hiring oct", "Direct").
 *
 * `rememberSource` and `visitSource` run in the browser (they read the
 * address and the tab's own storage); `readSource` and `sourceLabel` anywhere.
 */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
// Meta adds fbclid to every link out of Facebook and Instagram: kept so a
// server can still tie a form to its ad when the browser keeps no pixel cookie.
const LINK_KEYS: readonly string[] = [...UTM_KEYS, "fbclid"];
const SOURCE_KEYS: readonly string[] = [...LINK_KEYS, "referrer"];

export type VisitSource = Record<string, string>;

function linkTags(): VisitSource {
  const params = new URLSearchParams(window.location.search);
  const out: VisitSource = {};
  for (const key of LINK_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function outsideReferrer(): VisitSource {
  const from = document.referrer;
  return from && !from.startsWith(window.location.origin) ? { referrer: from } : {};
}

/**
 * In the browser, on the page a visit lands on: when its link carries tags,
 * keep them for the rest of the visit under `key`. An ad lands on one page and
 * the form may be sent from another, and a language switch drops the
 * address's tags; without this the office would read "Direct".
 */
export function rememberSource(key: string): void {
  const tags = linkTags();
  if (!Object.keys(tags).length) return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...tags, ...outsideReferrer() }));
  } catch {
    // Storage blocked (private mode): the page's own address still counts.
  }
}

/** In the browser: where this visitor came from, from the address, then what the visit kept, then the referrer. */
export function visitSource(key: string): VisitSource {
  const tags = linkTags();
  if (Object.keys(tags).length) return { ...tags, ...outsideReferrer() };
  try {
    const kept = readSource(sessionStorage.getItem(key));
    if (kept) return kept;
  } catch {
    // Storage blocked: fall through to the referrer.
  }
  return outsideReferrer();
}

/**
 * Where a visitor came from, as a public form posts it. Anything else in the
 * field is dropped, so a form cannot be used to store whatever a caller likes.
 */
export function readSource(raw: unknown): VisitSource | null {
  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const kept = Object.entries(parsed as Record<string, unknown>)
      .filter(([k, v]) => SOURCE_KEYS.includes(k) && typeof v === "string" && v.trim())
      .map(([k, v]) => [k, String(v).slice(0, 200)]);
    return kept.length ? Object.fromEntries(kept) : null;
  } catch {
    return null;
  }
}

// The names a link's tags and a sending site go by, in plain words. Meta's
// ads tag their links with placement codes (fb, ig, msg, an).
const SOURCE_NAMES: [RegExp, string][] = [
  [/^(fb|facebook)$|(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$/, "Facebook"],
  [/^(ig|instagram)$|(^|\.)instagram\.com$/, "Instagram"],
  [/^(msg|messenger)$|(^|\.)messenger\.com$/, "Messenger"],
  [/^an$/, "Meta's partner apps"],
  [/^meta$/, "Meta"],
  [/^(wa|whatsapp)$|(^|\.)whatsapp\.com$|^wa\.me$/, "WhatsApp"],
  [/^google$|(^|\.)google\.[a-z.]+$/, "Google"],
  [/^bing$|(^|\.)bing\.com$/, "Bing"],
  [/^tiktok$|(^|\.)tiktok\.com$/, "TikTok"],
  [/^snapchat$|(^|\.)snapchat\.com$/, "Snapchat"],
  [/^linkedin$|(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/^(x|twitter)$|(^|\.)(x|twitter)\.com$|^t\.co$/, "X"],
  [/^chatgpt(\.com)?$|(^|\.)chatgpt\.com$/, "ChatGPT"],
  // A page's share button tags its link so.
  [/^shared$/, "Shared link"],
];

const PAID = /^(paid|cpc|ppc|ads?|paid[_-]?social|display)$/;

function sourceName(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^www\./, "");
  return SOURCE_NAMES.find(([pattern]) => pattern.test(value))?.[1] ?? raw.trim();
}

/** Where a visitor came from, in words: the campaign, the site that sent them, or straight in. */
export function sourceLabel(source: VisitSource | null): string {
  if (source?.utm_source) {
    const name = sourceName(source.utm_source);
    const where = source.utm_medium && PAID.test(source.utm_medium.toLowerCase()) ? `${name} ad` : name;
    // A campaign is named by whoever made the link: "hiring-oct" reads "hiring oct".
    return source.utm_campaign ? `${where} · ${source.utm_campaign.replace(/[-_+]+/g, " ").trim()}` : where;
  }
  if (source?.referrer) {
    try {
      return sourceName(new URL(source.referrer).hostname);
    } catch {
      return "Another site";
    }
  }
  if (source?.fbclid) return "A Facebook or Instagram link";
  return "Direct";
}

/** Meta's click id rebuilt from the link's fbclid, in the form its `_fbc` cookie takes. */
export function metaClickId(source: VisitSource | null): string | undefined {
  return source?.fbclid ? `fb.1.${Date.now()}.${source.fbclid}` : undefined;
}
