/**
 * The cron watcher's old address. It lives in `cron.ts` since v2.1.0, when
 * the team moved cron watching to Healthchecks.io; this path stays so
 * `@socialize/team-kit/sentry` imports keep working. New code imports
 * `@socialize/team-kit/cron`.
 */
export * from "./cron.js";
