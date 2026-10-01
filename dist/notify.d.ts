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
 *
 * An event may carry buttons; a press comes back to the app's callback,
 * which reads it with `verifyPress` from `@socialize/team-kit/press`
 * (v2.8.0). A client with more than one branch keeps a group per branch:
 * the event names its branch with `scope` (v2.10.0). Since v2.11.0 an event
 * fills the one design every Telegram card is laid out in (`context`,
 * `status`, `details`, `tags`), keeps one living card up to date
 * (`follow: "update"` with `timeline_line`), can be claimed ("I'll handle
 * it") and can escalate when nobody presses in time.
 */
export interface NotifyConfig {
    /** The app's key from HQ. */
    key: string;
    /** HQ's door; the live one unless a test points elsewhere. */
    url?: string;
    /** How long to wait for HQ, in milliseconds. */
    timeoutMs?: number;
}
/**
 * A button that asks the app to do something. HQ puts it on the message and,
 * when someone in the room presses it, posts the press to the app's
 * callback (set in HQ → Settings → Telegram → Projects), signed; read it
 * with `verifyPress`. An app with no callback still has its events said,
 * without the buttons.
 */
export interface NotifyButton {
    /** What the button says, up to 32 letters. */
    label: string;
    /** The app's own verb, "booking.confirm": lowercase letters, digits, dots, dashes, underscores. */
    action: string;
    /** What the app needs to act, up to 1 KB of JSON; it comes back with the press. */
    payload?: Record<string, unknown>;
    /** "go" paints it green, "stop" red. */
    style?: "go" | "stop";
}
/** A fact on the card: an emoji, then the value. A label alone stands bold (the guest's name). */
export interface NotifyLine {
    icon?: string;
    /** Bold before the value, only when the value alone is unclear ("Amount QAR 6,500"). */
    label?: string;
    /** Wrapped in quotes (“Window table if possible”), it is said in italics. */
    value?: string;
}
export interface NotifyEvent {
    /** Our team, the client's own group, or both. Defaults to the team. */
    to?: "team" | "client" | "both";
    /** The app's own name for the event, "booking.new": threads and switches key on it. */
    key: string;
    /**
     * Which of the client's groups hears it, when they keep one per stream
     * (money and hiring away from the floor staff). Left out, the key's first
     * word decides: payment, invoice, credit, money → money; hiring,
     * application → hiring; anything else → ops. A stream with no group of its
     * own goes to the client's group for all.
     */
    stream?: "ops" | "money" | "hiring";
    /**
     * The branch it belongs to, for a client with a group per branch (v2.10.0):
     * the key HQ holds for that branch, lowercase letters, digits and dashes,
     * like "al-sadd" (`SCOPE_KEY`). A scoped event goes to that branch's group
     * and to the client's management group, and its buttons go up in the
     * branch's group only. Left out, only the management group hears it. A key
     * HQ does not hold for the client is dropped, and the event goes as if
     * unscoped.
     */
    scope?: string;
    /** Bolded first line, after the emoji. */
    title: string;
    /** One line in italics under it: what it is, in a sentence. */
    subtitle?: string;
    /** Facts, one per line, up to 15. */
    lines?: readonly NotifyLine[];
    /**
     * What the app knows about it, a group under the facts, up to six (v2.11.0):
     * `{ icon: "⭐", value: "Returning guest — 3rd visit, last on 12 Sep" }`.
     */
    context?: readonly {
        icon?: string;
        value: string;
    }[];
    /** Where it stands, in bold (v2.11.0): "⏳ Waiting for approval". A living card replaces it. */
    status?: string;
    /**
     * The long part, folded until someone opens it (v2.11.0): a guest's
     * history, a note. Several lines get a bullet each; up to 40 lines.
     */
    details?: {
        title?: string;
        lines: readonly string[];
    };
    /** Tags after the client's, up to four (v2.11.0): "West Bay" → #WestBay. The branch's own comes from `scope`. */
    tags?: readonly string[];
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
    /**
     * "reply" threads news of the same `about`; "edit" rewrites an open alert;
     * "update" (v2.11.0) rewrites the card about it in each room instead of
     * posting: `status` replaces its status line and `timeline_line` is added
     * to its timeline. A new status means the thing moved on, so the buttons
     * that asked about it come down. With no card to rewrite, it is said as a
     * card of its own. Needs `about`.
     */
    follow?: "reply" | "edit" | "update";
    /** One stamped line for a living card's timeline (v2.11.0): "🟢 Arrived · 20:34". */
    timeline_line?: string;
    /** Leads the title. */
    emoji?: string;
    /** Up to three buttons that call the app back when pressed. */
    buttons?: readonly NotifyButton[];
    /**
     * Adds "🙋 I'll handle it" where the buttons go, the client's own group
     * (v2.11.0): the first to press takes it and the card says who. HQ
     * answers it itself; the app is not called.
     */
    claim?: boolean;
    /**
     * How long the buttons (or the claim) may wait for a press, 5 to 120
     * minutes (v2.11.0). Past it HQ nudges under the card ("⏰ Still waiting —
     * 10 min"); after twice as long it tells the client's management group
     * and our team. Never in the quiet hours unless `urgent`.
     */
    escalate?: {
        after_minutes: number;
    };
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
/** A branch key as HQ reads it: "al-sadd", "west-bay". */
export declare const SCOPE_KEY: RegExp;
export declare function notify(config: NotifyConfig, event: NotifyEvent): Promise<NotifyResult>;
