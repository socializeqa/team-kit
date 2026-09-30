/**
 * The plumbing every Socialize project shares.
 *
 * What belongs here: the pipes — sending, formatting, parsing. Things that
 * behave identically whichever client's software they serve.
 *
 * What does not: anything with a look. The admin kits stay in their own
 * repos on purpose, because a restaurant's panel and a decoration
 * company's panel are meant to differ, and forcing one design on both
 * would be a rewrite that buys nothing.
 */
export * as whatsapp from "./whatsapp.js";
export * as telegram from "./telegram.js";
export * as phone from "./phone.js";
export * as money from "./money.js";
export * as cron from "./cron.js";
/** The same module as `cron`, under its v2.0 name. */
export * as sentry from "./sentry.js";
export * as changelog from "./changelog.js";
/** The Telegram hub: tell HQ, and HQ's bot tells our team and the client's own group. */
export * as notify from "./notify.js";
/** The one way an app talks to a model: strict JSON, nothing kept, a backup model. */
export * as ai from "./ai.js";
/** The client's brain, kept once in HQ and read by every writer that speaks for them. */
export * as brain from "./brain.js";
/** What a Sentry report never carries: cookies, and the keys some addresses hold. */
export * as scrub from "./scrub.js";
export type { WhatsAppConfig, SendResult, TemplateMessage } from "./whatsapp.js";
export type { TelegramConfig, Post, TelegramResult } from "./telegram.js";
export type { Country } from "./phone.js";
export type { CronConfig } from "./cron.js";
export type { ChangelogEntry, FeedConfig, FeedResult, AuditConfig, AuditResult } from "./changelog.js";
export type { NotifyConfig, NotifyEvent, NotifyResult } from "./notify.js";
export type { AiConfig, AiUsage, AskJson, HqAiConfig } from "./ai.js";
export type { BrainConfig, BrainLine, BrainResult } from "./brain.js";
export type { ScrubRules } from "./scrub.js";
