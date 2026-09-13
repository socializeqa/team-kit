/**
 * Tell the watchers that a scheduled job ran, and whether it worked.
 *
 * A cron that stops firing is the quietest failure there is: nothing errors,
 * nothing 500s, the logs simply have one fewer line each night and nobody
 * reads logs for absences. A Señorritas autopost job sat switched off for
 * seventeen days before anyone noticed.
 *
 * Two watchers can hear a run, and a project passes whichever it uses:
 *
 *   healthchecks  Healthchecks.io, the team's cron watcher since 13 Sep
 *                 2026. The check (its schedule and grace) is created once
 *                 through Healthchecks' API; the job only pings it by slug.
 *   dsn           Sentry Crons. Sentry's free plan keeps ONE cron monitor
 *                 switched on for the whole organisation, which is why the
 *                 team moved: eight jobs went unwatched from 17 Aug 2026.
 *
 * Nothing here ever throws or blocks: a job that ran but could not report
 * beats a job that failed because its reporting did.
 */
export interface CronConfig {
    /** The project's Sentry DSN. Empty, missing or malformed means no Sentry check-ins. */
    dsn?: string;
    /**
     * The Healthchecks.io project's ping key. The job's slug names the check
     * inside that project. An empty key means no pings.
     */
    healthchecks?: {
        pingKey: string;
        base?: string;
    };
}
/**
 * Mark a job as started. `schedule` is the crontab line from vercel.json,
 * verbatim; Sentry learns the timetable from it, Healthchecks already holds
 * it on the check.
 *
 * The id is minted here (Sentry's overlapping-jobs pattern, Healthchecks'
 * `rid`) and sent on both ends. Correlating by slug alone raced on Sentry:
 * whenever the closing "ok" overtook the opening "in_progress" through
 * ingest, the open check-in aged into a timeout — "Cron failure:
 * auto-statements" every few nights on Damine, with the job itself green.
 * Returns the id for jobFinished.
 */
export declare function jobStarted(config: CronConfig, slug: string, schedule: string): Promise<string>;
/**
 * Close the loop. `ok: false` raises the job as failed rather than missed.
 * Pass the id jobStarted returned so the close lands on the same run
 * whatever order the requests arrive in.
 */
export declare function jobFinished(config: CronConfig, slug: string, ok: boolean, runId?: string): Promise<void>;
/**
 * Run a scheduled job with both ends reported, so the routes themselves
 * stay about the work and not about the watching.
 *
 * A job that throws is reported failed and then rethrown — swallowing it
 * here would turn a loud crash into a quiet one, which is the opposite of
 * the point. Anything that answers 5xx counts as failed too: sweeps tend to
 * return a 500 rather than throw when part of the night goes wrong.
 */
export declare function watched(config: CronConfig, slug: string, schedule: string, job: () => Promise<Response>): Promise<Response>;
