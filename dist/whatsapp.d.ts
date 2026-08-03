/**
 * WhatsApp Cloud API — Meta's pipes, the project's identity.
 *
 * Three projects had written this separately, which is three places to fix
 * a Graph version bump and three chances to get a template's parameter
 * order wrong. Configuration is passed in rather than read from the
 * environment, because Señorritas resolves credentials per branch at
 * request time and only the caller knows which line is speaking.
 *
 * Nothing here throws. A message that fails to send must never take down
 * the work that asked for it — every call answers with a result the caller
 * can act on or ignore.
 */
/** Which line is speaking. */
export interface WhatsAppConfig {
    /** A system-user or permanent token with whatsapp_business_messaging. */
    token: string;
    /** The sending number's id, not the number itself. */
    phoneNumberId: string;
    /**
     * Graph version, newest by default. Meta retires old ones roughly
     * yearly; pin only to hold a version back deliberately.
     */
    graphVersion?: string;
}
export interface SendResult {
    ok: boolean;
    /** Meta's message id — proof it was accepted, not that it arrived. */
    id?: string;
    error?: string;
}
/** A body parameter, in the order the approved template declares them. */
export type TemplateParams = readonly string[];
export interface TemplateMessage {
    /** The approved template's name. */
    name: string;
    /** Language code the template was approved in. */
    language?: string;
    /** Body {{n}} fills, in order. Single-line — Meta rejects newlines. */
    body?: TemplateParams;
    /**
     * The tail of a URL button's link, when the template carries one.
     * Meta only ever accepts the variable part, never the whole URL.
     */
    urlSuffix?: string;
}
/**
 * A business-initiated message. Outside the 24-hour service window this is
 * the only kind Meta will carry, and the template must already be approved
 * — an unapproved name is the usual reason a send "silently" fails.
 */
export declare function sendTemplate(config: WhatsAppConfig, to: string, message: TemplateMessage): Promise<SendResult>;
/**
 * Free-form text. Only reaches someone who has written to the line within
 * the last 24 hours; outside that window Meta accepts nothing but a
 * template.
 */
export declare function sendText(config: WhatsAppConfig, to: string, text: string): Promise<SendResult>;
/** An image by public URL, with an optional caption. Same 24-hour rule. */
export declare function sendImage(config: WhatsAppConfig, to: string, imageUrl: string, caption?: string): Promise<SendResult>;
/** Meta wants digits with a country code and nothing else — no +, no spaces. */
export declare function digitsOnly(phone: string): string;
