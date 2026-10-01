/**
 * Telegram — the voice of the people who run a business.
 *
 * The rule that keeps the team sane: Telegram carries messages to the
 * people who run the business (our team, and since 29 September 2026 our
 * clients' owners and staff too), WhatsApp carries messages to their guests
 * and customers. Never the reverse. A guest who receives a Telegram notice
 * is confused; a staff notice on WhatsApp costs a template and risks the line.
 * An app tells HQ through `notify` rather than holding a bot of its own.
 *
 * Never throws — a bot that cannot speak must not stop the work.
 */
/** Telegram's HTML mode needs only these three escaped. */
function escape(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/**
 * The one design HQ lays every Telegram card out in (v2.11.0): the emoji and
 * the title in bold, the summary in italics, then a fact a line ("emoji, two
 * spaces, the value", a label in bold before it), then the closing note in
 * italics. HQ's own renderer adds the status, the folded part and the tags;
 * an app speaks through `notify` and gets those there.
 */
export function render(post) {
    const head = [`${post.emoji ? `${post.emoji} ` : ""}<b>${escape(post.title)}</b>`];
    if (post.subtitle)
        head.push(`<i>${escape(post.subtitle)}</i>`);
    const facts = (post.lines ?? []).flatMap((line) => {
        const words = [line.label ? `<b>${escape(line.label)}</b>` : "", line.value ? escape(line.value) : ""].filter(Boolean).join(" ");
        if (!words)
            return [];
        return [line.icon ? `${line.icon}  ${words}` : words];
    });
    const groups = [head, facts, post.note ? [`<i>${escape(post.note)}</i>`] : []].filter((group) => group.length);
    return groups.map((group) => group.join("\n")).join("\n\n");
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
