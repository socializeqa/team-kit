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
