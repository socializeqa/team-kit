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
/** Telegram's HTML mode needs only these three escaped. */
function escape(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** Title, facts, closing note — assembled the same way every time. */
export function render(post) {
    const parts = [`${post.emoji ? `${post.emoji} ` : ""}<b>${escape(post.title)}</b>`];
    if (post.subtitle)
        parts.push(escape(post.subtitle));
    for (const line of post.lines ?? []) {
        const icon = line.icon ? `${line.icon} ` : "";
        const label = line.label ? `<b>${escape(line.label)}</b> ` : "";
        parts.push(`${icon}${label}${escape(line.value)}`);
    }
    if (post.note)
        parts.push(`\n<i>${escape(post.note)}</i>`);
    return parts.join("\n");
}
export async function send(config, post) {
    try {
        const body = {
            chat_id: post.chatId,
            text: render(post),
            parse_mode: "HTML",
            disable_notification: post.silent === true,
            link_preview_options: { is_disabled: true },
        };
        if (post.threadId)
            body.message_thread_id = post.threadId;
        if (post.link) {
            body.reply_markup = {
                inline_keyboard: [[{ text: post.link.label, url: post.link.url }]],
            };
        }
        const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(8_000),
        });
        const payload = await response
            .json()
            .catch(() => ({}));
        return payload.ok
            ? { ok: true }
            : { ok: false, error: payload.description ?? `HTTP ${response.status}` };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
/**
 * The chats a bot can currently see. Telegram only reveals a group's id
 * once the bot has been added and something has been said in it, so this
 * is how an id gets found without copying it by hand.
 */
export async function visibleChats(config) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${config.token}/getUpdates`, { cache: "no-store" });
        const payload = await response.json();
        if (!payload.ok)
            return [];
        const found = new Map();
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
    }
    catch {
        return [];
    }
}
