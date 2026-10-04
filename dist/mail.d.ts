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
export interface MailConfig {
    /** The app's key from HQ, the one `notify` uses. */
    key: string;
    /** HQ's door; the live one unless a test points elsewhere. */
    url?: string;
    timeoutMs?: number;
}
/** At most this many ids in one ask. */
export declare const MAX_IDS = 100;
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
export declare const FATES: readonly ["complained", "bounced", "failed", "suppressed", "delivered", "delivery_delayed", "sent"];
export type Fate = (typeof FATES)[number];
/** How each fate reads to the person who sent the letter. */
export declare const FATE_WORDS: Record<Fate, string>;
/** The fates a person has to act on: the letter did not reach anyone who wants it. */
export declare function isTrouble(fate: Fate): boolean;
export interface MailFate {
    fate: Fate;
    at: string;
    why: string | null;
}
/** One letter's fate from its events, or null before Resend has said anything we keep. */
export declare function fateOf(events: Pick<MailEvent, "event" | "at" | "why">[]): MailFate | null;
export interface FatesResult {
    ok: boolean;
    /** By Resend id. A letter HQ has heard nothing about is not in it. */
    fates?: Record<string, MailFate>;
    error?: string;
}
export declare const MAIL_URL = "https://socialize.qa/api/email-status";
/** What became of these letters, by the ids Resend gave them. */
export declare function readFates(config: MailConfig, ids: string[]): Promise<FatesResult>;
