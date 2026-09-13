/**
 * Telegram — the house's internal voice.
 *
 * The rule that keeps the team sane: Telegram carries messages between
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
    lines?: readonly {
        icon?: string;
        label?: string;
        value: string;
    }[];
    /** Small closing line: when, and by whom. */
    note?: string;
    /** Becomes a button. */
    link?: {
        label: string;
        url: string;
    };
    /** A forum topic inside a group. Personal chats have no threads. */
    threadId?: number;
    /** Posted without a sound. */
    silent?: boolean;
    /** Leads the title. */
    emoji?: string;
}
/** Title, facts, closing note — assembled the same way every time. */
export declare function render(post: Post): string;
export declare function send(config: TelegramConfig, post: Post): Promise<TelegramResult>;
/**
 * The chats a bot can currently see. Telegram only reveals a group's id
 * once the bot has been added and something has been said in it, so this
 * is how an id gets found without copying it by hand.
 */
export declare function visibleChats(config: TelegramConfig): Promise<{
    id: string;
    title: string;
    type: string;
}[]>;
