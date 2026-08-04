/**
 * Tell Sentry that a scheduled job ran, and whether it worked.
 *
 * A cron that stops firing is the quietest failure there is: nothing errors,
 * nothing 500s, the logs simply have one fewer line each night and nobody
 * reads logs for absences. A Señorritas autopost job sat switched off for
 * seventeen days before anyone noticed.
 *
 * This closes that. Sentry knows each job's schedule, so a run that never
 * starts raises an issue on its own — the alert comes from the silence, not
 * from an error. The monitor creates itself from the schedule passed here,
 * so there is nothing to set up in the UI and no second place to keep the
 * timings in step with vercel.json.
 *
 * Nothing here ever throws or blocks: a job that ran but could not report
 * beats a job that failed because its reporting did.
 */
export interface CronConfig {
    /** The project's Sentry DSN. Empty or malformed turns every call into a no-op. */
    dsn: string;
}
/**
 * Mark a job as started, and teach Sentry when it should expect the next
 * one. `schedule` is the crontab line from vercel.json, verbatim.
 *
 * The ingest endpoint answers 202 with an empty body — it does not hand
 * back a check-in id, whatever the docs imply — so the pair is correlated
 * by monitor slug rather than threaded by id. Sentry closes the open
 * check-in when the matching result arrives.
 */
export declare function jobStarted(config: CronConfig, slug: string, schedule: string): Promise<void>;
/** Close the loop. `ok: false` raises the job as failed rather than missed. */
export declare function jobFinished(config: CronConfig, slug: string, ok: boolean): Promise<void>;
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
