/**
 * Google reviews — a client's reviews as HQ keeps them: pulled through
 * Metricool every half hour, a reply drafted from the client's brain, and
 * posted by a person's press. HQ does all of that once; a client's own panel
 * is one more pair of hands on the same reviews, so a reply saved in the
 * client's panel reads the same in HQ's Reviews room (Damine, 30 September
 * 2026: "using our unified brain and unified components").
 *
 * The same key as `notify` and `brain`: an app reaches its own client's
 * reviews and no other's. Every press names the person who made it; HQ's
 * activity book and the posted reply carry that name with the app's. Config
 * is passed in; nothing here throws.
 */

export interface ReviewsConfig {
  /** The app's key from HQ, the one `notify` uses. */
  key: string;
  /** HQ's door; the live one unless a test points elsewhere. */
  url?: string;
  timeoutMs?: number;
}

export const REVIEW_STATUSES = ["new", "draft", "approved", "posted", "skipped", "answered"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** How each standing reads to the people who answer reviews. */
export const REVIEW_STATUS_WORDS: Record<ReviewStatus, string> = {
  new: "No draft yet",
  draft: "To answer",
  approved: "To post",
  posted: "Posted",
  skipped: "Skipped",
  answered: "Answered on Google",
};

export interface ClientReview {
  id: string;
  /** The location's short name, as HQ connected it: "West Bay". */
  place: string;
  reviewer: string | null;
  /** 1 to 5. */
  stars: number;
  body: string | null;
  reviewedAt: string;
  /** When HQ first filed it: a new low rating is rung by this, not by the review's own date. */
  filedAt: string;
  status: ReviewStatus;
  /** The reply as it stands: the brain's draft, or a person's edit of it. */
  reply: string | null;
  /** Why the writer wants a person to read this one first; null when nothing is flagged. */
  flag: string | null;
  postedAt: string | null;
  /** "Dina · Señorritas Tex Mex", or the Socialize member who posted it. */
  postedBy: string | null;
  postError: string | null;
  /** The reply Google shows, whoever wrote it. */
  googleReply: string | null;
}

export interface ReviewPlace {
  label: string;
  signOff: string;
  /** When HQ last read this location's reviews. */
  pulledAt: string | null;
}

export interface ReviewsResult {
  ok: boolean;
  places?: ReviewPlace[];
  reviews?: ClientReview[];
  error?: string;
}

/** A person's press on a review, named by who made it. */
export type ReviewPress =
  | { action: "save"; id: string; reply: string; lesson?: string; by: string }
  | { action: "skip" | "restore" | "redraft"; id: string; by: string }
  | { action: "post"; ids: string[]; by: string };

export interface PressResult {
  ok: boolean;
  /** The pressed reviews as they stand now, whether the press worked or not. */
  reviews?: ClientReview[];
  /** A post: replies Google shows already, and ones Metricool took that the next pull confirms. */
  posted?: number;
  waiting?: number;
  failed?: { id: string; error: string }[];
  error?: string;
}

export const REVIEWS_URL = "https://socialize.qa/api/reviews";

async function call<T extends { ok: boolean; error?: string }>(config: ReviewsConfig, init: RequestInit): Promise<T> {
  if (!config.key) return { ok: false, error: "No hub key." } as T;
  try {
    const response = await fetch(config.url ?? REVIEWS_URL, {
      ...init,
      headers: { Authorization: `Bearer ${config.key}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      signal: AbortSignal.timeout(config.timeoutMs ?? 20_000),
    });
    const body = (await response.json().catch(() => null)) as T | null;
    if (!body) return { ok: false, error: `HQ answered ${response.status}.` } as T;
    if (!response.ok || !body.ok) return { ...body, ok: false, error: body.error ?? `HQ answered ${response.status}.` } as T;
    return body;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) } as T;
  }
}

/** The client's reviews, newest first, and the locations they come from. */
export async function readReviews(config: ReviewsConfig): Promise<ReviewsResult> {
  const body = await call<ReviewsResult>({ ...config, timeoutMs: config.timeoutMs ?? 10_000 }, { method: "GET", cache: "no-store" });
  if (!body.ok) return { ok: false, error: body.error };
  return { ok: true, places: body.places ?? [], reviews: body.reviews ?? [] };
}

/**
 * Save a reply (and teach the brain a lesson), skip a review or bring it
 * back, ask the brain for a new draft, or post replies on Google. Posting
 * reads Google back before it says a reply is there.
 */
export async function pressReview(config: ReviewsConfig, press: ReviewPress): Promise<PressResult> {
  return call<PressResult>(config, { method: "POST", body: JSON.stringify(press) });
}

// ---- Reading them --------------------------------------------------------------

/** Still waiting for an answer from us. */
export function isOpen(review: Pick<ClientReview, "status">): boolean {
  return review.status === "new" || review.status === "draft" || review.status === "approved";
}

/**
 * Google keeps a reply to 4,096 bytes, not characters (Business Profile API,
 * ReviewReply.comment): an Arabic letter is two bytes, an emoji four.
 */
export const REPLY_LIMIT = 4096;

export function replyBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The average rating to one decimal, or null with nothing to average. */
export function averageStars(reviews: Pick<ClientReview, "stars">[]): number | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((total, review) => total + review.stars, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export interface MonthScore {
  /** "2026-09", Doha's calendar. */
  month: string;
  count: number;
  /** Null in a month with no reviews. */
  average: number | null;
}

/** The month a moment falls in, in Doha (UTC+3, no summer time). */
export function dohaMonth(at: string | Date): string {
  const time = typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(time + 3 * 3_600_000).toISOString().slice(0, 7);
}

/**
 * The last `months` months, oldest first, each with its count and average,
 * a quiet month included so the line has no gaps it does not show.
 */
export function monthlyScores(reviews: Pick<ClientReview, "stars" | "reviewedAt">[], months = 12, now: Date = new Date()): MonthScore[] {
  const byMonth = new Map<string, number[]>();
  for (const review of reviews) {
    const key = dohaMonth(review.reviewedAt);
    const list = byMonth.get(key) ?? [];
    list.push(review.stars);
    byMonth.set(key, list);
  }
  const [year, month] = dohaMonth(now).split("-").map(Number) as [number, number];
  const out: MonthScore[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const first = new Date(Date.UTC(year, month - 1 - back, 1));
    const key = first.toISOString().slice(0, 7);
    const stars = byMonth.get(key) ?? [];
    out.push({ month: key, count: stars.length, average: averageStars(stars.map((value) => ({ stars: value }))) });
  }
  return out;
}
