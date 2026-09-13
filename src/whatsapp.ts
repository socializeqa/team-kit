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

import { digits } from "./phone.js";

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

const DEFAULT_GRAPH_VERSION = "v26.0";
const TIMEOUT_MS = 15_000;

function endpoint(config: WhatsAppConfig): string {
  const version = config.graphVersion ?? DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;
}

async function post(config: WhatsAppConfig, body: unknown): Promise<SendResult> {
  try {
    const response = await fetch(endpoint(config), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload: {
      messages?: { id?: string }[];
      error?: { message?: string };
    } = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: payload.error?.message ?? `HTTP ${response.status}`,
      };
    }
    return { ok: true, id: payload.messages?.[0]?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * A business-initiated message. Outside the 24-hour service window this is
 * the only kind Meta will carry, and the template must already be approved
 * — an unapproved name is the usual reason a send "silently" fails.
 */
export function sendTemplate(
  config: WhatsAppConfig,
  to: string,
  message: TemplateMessage,
): Promise<SendResult> {
  const components: Record<string, unknown>[] = [];
  if (message.body?.length) {
    components.push({
      type: "body",
      parameters: message.body.map((text) => ({ type: "text", text })),
    });
  }
  if (message.urlSuffix !== undefined) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: message.urlSuffix }],
    });
  }
  return post(config, {
    messaging_product: "whatsapp",
    to: digits(to),
    type: "template",
    template: {
      name: message.name,
      language: { code: message.language ?? "en" },
      ...(components.length ? { components } : {}),
    },
  });
}

/**
 * Free-form text. Only reaches someone who has written to the line within
 * the last 24 hours; outside that window Meta accepts nothing but a
 * template.
 */
export function sendText(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<SendResult> {
  return post(config, {
    messaging_product: "whatsapp",
    to: digits(to),
    type: "text",
    text: { body: text, preview_url: false },
  });
}

/** An image by public URL, with an optional caption. Same 24-hour rule. */
export function sendImage(
  config: WhatsAppConfig,
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<SendResult> {
  return post(config, {
    messaging_product: "whatsapp",
    to: digits(to),
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

/**
 * Meta wants digits with a country code and nothing else — no +, no spaces.
 * This is `phone.digits` under its older name, kept so existing imports
 * keep working; new code calls `phone.digits`.
 */
export const digitsOnly = digits;
