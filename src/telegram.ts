/**
 * Telegram — the house's internal voice.
 *
 * The rule that keeps the fleet sane: Telegram carries messages between
 * the people who run the business, WhatsApp carries messages to clients.
 * Never the reverse. A client who receives a Telegram notice is confused;
 * a staff notice on WhatsApp costs a template and risks the line.
 *
 * Never throws — a bot that cannot speak must not stop the work.
 */

export interface TelegramConfig {
  /** The bot token from BotFather. */
  token: string;
}

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

export interface Post {
  /** A group id (negative) or a person's own chat id (positive). */
  chatId: string;
  /** Bolded first line. */
  title: string;
  /** The line under it — usually who or what it concerns. */
  subtitle?: string;
  /** Facts, one per line. */
  lines?: readonly { icon?: string; label?: string; value: string }[];
  /** Small closing line: when, and by whom. */
  note?: string;
  /** Becomes a button. */
  link?: { label: string; url: string };
  /** A forum topic inside a group. Personal chats have no threads. */
  threadId?: number;
  /** Posted without a sound. */
  silent?: boolean;
  /** Leads the title. */
  emoji?: string;
}

/** Telegram's HTML mode needs only these three escaped. */
function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Title, facts, closing note — assembled the same way every time. */
export function render(post: Post): string {
  const parts = [`${post.emoji ? `${post.emoji} ` : ""}<b>${escape(post.title)}</b>`];
  if (post.subtitle) parts.push(escape(post.subtitle));
  for (const line of post.lines ?? []) {
    const icon = line.icon ? `${line.icon} ` : "";
    const label = line.label ? `<b>${escape(line.label)}</b> ` : "";
    parts.push(`${icon}${label}${escape(line.value)}`);
  }
  if (post.note) parts.push(`\n<i>${escape(post.note)}</i>`);
  return parts.join("\n");
}

export async function send(
  config: TelegramConfig,
  post: Post,
): Promise<TelegramResult> {
  try {
    const body: Record<string, unknown> = {
      chat_id: post.chatId,
      text: render(post),
      parse_mode: "HTML",
      disable_notification: post.silent === true,
      link_preview_options: { is_disabled: true },
    };
    if (post.threadId) body.message_thread_id = post.threadId;
    if (post.link) {
      body.reply_markup = {
        inline_keyboard: [[{ text: post.link.label, url: post.link.url }]],
      };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      },
    );
    const payload: { ok?: boolean; description?: string } = await response
      .json()
      .catch(() => ({}));
    return payload.ok
      ? { ok: true }
      : { ok: false, error: payload.description ?? `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The chats a bot can currently see. Telegram only reveals a group's id
 * once the bot has been added and something has been said in it, so this
 * is how an id gets found without copying it by hand.
 */
export async function visibleChats(
  config: TelegramConfig,
): Promise<{ id: string; title: string; type: string }[]> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/getUpdates`,
      { cache: "no-store" },
    );
    const payload: {
      ok?: boolean;
      result?: {
        message?: { chat?: { id: number; title?: string; type: string } };
        my_chat_member?: { chat?: { id: number; title?: string; type: string } };
      }[];
    } = await response.json();
    if (!payload.ok) return [];

    const found = new Map<string, { id: string; title: string; type: string }>();
    for (const update of payload.result ?? []) {
      const chat = update.message?.chat ?? update.my_chat_member?.chat;
      if (chat) {
        found.set(String(chat.id), {
          id: String(chat.id),
          title: chat.title ?? "Direct chat",
          type: chat.type,
        });
      }
    }
    return [...found.values()];
  } catch {
    return [];
  }
}
