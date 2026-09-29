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
export interface NotifyConfig {
    /** The app's key from HQ. */
    key: string;
    /** HQ's door; the live one unless a test points elsewhere. */
    url?: string;
    /** How long to wait for HQ, in milliseconds. */
    timeoutMs?: number;
}
export interface NotifyEvent {
    /** Our team, the client's own group, or both. Defaults to the team. */
    to?: "team" | "client" | "both";
    /** The app's own name for the event, "booking.new": threads and switches key on it. */
    key: string;
    /** Bolded first line. */
    title: string;
    /** The line under it: who or what it concerns. */
    subtitle?: string;
    /** Facts, one per line. */
    lines?: readonly {
        icon?: string;
        label?: string;
        value: string;
    }[];
    /** A button into the app itself, https only. */
    link?: {
        label: string;
        url: string;
    };
    /** What it is about, so later news of the same thing answers under it. */
    about?: {
        kind: string;
        id: string;
    };
    /** Posted without a sound. Defaults to a ping. */
    tier?: "ping" | "silent";
    /** Still buzzes in the quiet hours: only for something broken right now. */
    urgent?: boolean;
    /** "reply" threads news of the same `about`; "edit" rewrites an open alert. */
    follow?: "reply" | "edit";
    /** Leads the title. */
    emoji?: string;
}
export interface NotifyResult {
    ok: boolean;
    /** How many rooms heard it. */
    sent?: number;
    /** What HQ had no room for yet: "our team group", "the client's group". */
    missing?: string[];
    error?: string;
}
export declare const HUB_URL = "https://socialize.qa/api/notify";
export declare function notify(config: NotifyConfig, event: NotifyEvent): Promise<NotifyResult>;
