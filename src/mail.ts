/**
 * What became of an email after it left: delivered, bounced, marked as spam.
 * Every team app sends through the house's Resend account, and Resend tells
 * one place, HQ's webhook. An app asks HQ about the ids Resend gave it and
 * hears back only about letters sent from its own domain.
 *
 * A bounce is the reason this exists: an interview invite that never arrived
 * looks, from the panel, exactly like one the candidate ignored. Config is
 * passed in; nothing here throws.
 */

import { callHq } from "./hq.js";

export interface MailConfig {
  /** The app's key from HQ, the one `notify` uses. */
  key: string;
  /** HQ's door; the live one unless a test points elsewhere. */
  url?: string;
  timeoutMs?: number;
}

/** At most this many ids in one ask. */
export const MAX_IDS = 100;

/** Resend's events, as HQ keeps them, without the `email.` in front. */
export type MailEvent = {
  /** The id Resend answered the send with. */
  id: string;
  event: string;
  at: string;
  /** The receiving server's words, on a bounce. */
  why: string | null;
};

/** The most telling event first: a complaint after delivery is the news, a delay before it is not. */
export const FATES = ["complained", "bounced", "failed", "suppressed", "delivered", "delivery_delayed", "sent"] as const;
export type Fate = (typeof FATES)[number];

/** How each fate reads to the person who sent the letter. */
export const FATE_WORDS: Record<Fate, string> = {
  complained: "Marked as spam",
  bounced: "Bounced",
  failed: "Failed to send",
  suppressed: "Not sent: this address bounced before",
  delivered: "Delivered",
  delivery_delayed: "Delayed",
  sent: "Sent",
};

/** The fates a person has to act on: the letter did not reach anyone who wants it. */
export function isTrouble(fate: Fate): boolean {
  return fate === "complained" || fate === "bounced" || fate === "failed" || fate === "suppressed";
}

export interface MailFate {
  fate: Fate;
  at: string;
  why: string | null;
}

/** One letter's fate from its events, or null before Resend has said anything we keep. */
export function fateOf(events: Pick<MailEvent, "event" | "at" | "why">[]): MailFate | null {
  for (const fate of FATES) {
    const hit = events.filter((each) => each.event === fate).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (hit) return { fate, at: hit.at, why: hit.why };
  }
  return null;
}

export interface FatesResult {
  ok: boolean;
  /** By Resend id. A letter HQ has heard nothing about is not in it. */
  fates?: Record<string, MailFate>;
  error?: string;
}

export const MAIL_URL = "https://socialize.qa/api/email-status";

/** What became of these letters, by the ids Resend gave them. */
export async function readFates(config: MailConfig, ids: string[]): Promise<FatesResult> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return { ok: true, fates: {} };
  if (unique.length > MAX_IDS) return { ok: false, error: `At most ${MAX_IDS} ids at a time.` };
  const body = await callHq<{ ok: boolean; events?: MailEvent[]; error?: string }>(
    config.url ?? MAIL_URL,
    config.key,
    { method: "POST", body: JSON.stringify({ ids: unique }) },
    config.timeoutMs ?? 10_000,
  );
  if (!body.ok) return { ok: false, error: body.error };
  const byId = new Map<string, MailEvent[]>();
  for (const event of body.events ?? []) byId.set(event.id, [...(byId.get(event.id) ?? []), event]);
  const fates: Record<string, MailFate> = {};
  for (const [id, events] of byId) {
    const fate = fateOf(events);
    if (fate) fates[id] = fate;
  }
  return { ok: true, fates };
}

