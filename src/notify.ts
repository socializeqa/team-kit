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
 * the event names its branch with `scope` (v2.10.0).
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
  /** Bolded first line. */
  title: string;
  /** The line under it: who or what it concerns. */
  subtitle?: string;
  /** Facts, one per line. */
  lines?: readonly { icon?: string; label?: string; value: string }[];
  /** A button into the app itself, https only. */
  link?: { label: string; url: string };
  /** What it is about, so later news of the same thing answers under it. */
  about?: { kind: string; id: string };
  /** Posted without a sound. Defaults to a ping. */
  tier?: "ping" | "silent";
  /** Still buzzes in the quiet hours: only for something broken right now. */
  urgent?: boolean;
  /** "reply" threads news of the same `about`; "edit" rewrites an open alert. */
  follow?: "reply" | "edit";
  /** Leads the title. */
  emoji?: string;
  /** Up to three buttons that call the app back when pressed. */
  buttons?: readonly NotifyButton[];
}

export interface NotifyResult {
  ok: boolean;
  /** How many rooms heard it. */
  sent?: number;
  /** What HQ had no room for yet: "our team group", "the client's group". */
  missing?: string[];
  error?: string;
}

export const HUB_URL = "https://socialize.qa/api/notify";

/** A branch key as HQ reads it: "al-sadd", "west-bay". */
export const SCOPE_KEY = /^[a-z0-9-]{1,40}$/;

export async function notify(config: NotifyConfig, event: NotifyEvent): Promise<NotifyResult> {
  if (!config.key) return { ok: false, error: "No hub key." };
  try {
    const response = await fetch(config.url ?? HUB_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(config.timeoutMs ?? 8000),
    });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; sent?: number; missing?: string[]; error?: string } | null;
    if (!response.ok || !body?.ok) return { ok: false, error: body?.error ?? `HQ answered ${response.status}.` };
    return { ok: true, sent: body.sent ?? 0, missing: body.missing ?? [] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
