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
const HC_BASE = "https://hc-ping.com";
/**
 * Built from the DSN so there is one source of truth for the project. The
 * caller passes it, like every other config in this kit — reading the
 * environment here would tie the package to Node and to one variable name.
 */
function checkInUrl(config, slug) {
    // https://<key>@o<org>.ingest.<region>.sentry.io/<project>
    const parts = config.dsn?.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)\/?$/);
    const [, key, host, project] = parts ?? [];
    if (!key || !host || !project)
        return null;
    return `https://${host}/api/${project}/cron/${slug}/${key}/`;
}
/**
 * `https://hc-ping.com/<ping-key>/<slug>[/start|/fail]?rid=<uuid>`. The run
 * id pairs a start with its finish, so Healthchecks measures the real
 * duration even when two runs overlap.
 */
function pingUrl(config, slug, signal, runId) {
    const pingKey = config.healthchecks?.pingKey?.trim();
    if (!pingKey)
        return null;
    const base = (config.healthchecks?.base ?? HC_BASE).replace(/\/+$/, "");
    const suffix = signal === "success" ? "" : `/${signal}`;
    return `${base}/${encodeURIComponent(pingKey)}/${encodeURIComponent(slug)}${suffix}?rid=${runId}`;
}
async function send(url, body) {
    try {
        await fetch(url, {
            method: "POST",
            ...(body === undefined
                ? {}
                : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
            // A slow check-in must never hold up the work it is reporting on.
            signal: AbortSignal.timeout(5000),
        });
    }
    catch {
        // Losing a check-in is not worth failing the job over.
    }
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
export async function jobStarted(config, slug, schedule) {
    const runId = crypto.randomUUID();
    const sentry = checkInUrl(config, slug);
    const hc = pingUrl(config, slug, "start", runId);
    await Promise.all([
        sentry
            ? send(sentry, {
                check_in_id: runId,
                status: "in_progress",
                monitor_config: {
                    schedule: { type: "crontab", value: schedule },
                    // Vercel fires crons on a best-effort basis and the drift is
                    // real: a 05:00 sweep checked in at 05:34 on its first live
                    // morning. An hour never pages anybody for lateness and still
                    // catches a job that did not run the same day.
                    checkin_margin: 60,
                    max_runtime: 30,
                    timezone: "Etc/UTC",
                },
            })
            : undefined,
        hc ? send(hc) : undefined,
    ]);
    return runId;
}
/**
 * Close the loop. `ok: false` raises the job as failed rather than missed.
 * Pass the id jobStarted returned so the close lands on the same run
 * whatever order the requests arrive in.
 */
export async function jobFinished(config, slug, ok, runId) {
    const sentry = checkInUrl(config, slug);
    const hc = runId ? pingUrl(config, slug, ok ? "success" : "fail", runId) : null;
    await Promise.all([
        sentry
            ? send(sentry, { ...(runId ? { check_in_id: runId } : {}), status: ok ? "ok" : "error" })
            : undefined,
        hc ? send(hc) : undefined,
    ]);
}
/**
 * Run a scheduled job with both ends reported, so the routes themselves
 * stay about the work and not about the watching.
 *
 * A job that throws is reported failed and then rethrown — swallowing it
 * here would turn a loud crash into a quiet one, which is the opposite of
 * the point. Anything that answers 5xx counts as failed too: sweeps tend to
 * return a 500 rather than throw when part of the night goes wrong.
 */
export async function watched(config, slug, schedule, job) {
    const runId = await jobStarted(config, slug, schedule);
    try {
        const response = await job();
        await jobFinished(config, slug, response.status < 500, runId);
        return response;
    }
    catch (caught) {
        await jobFinished(config, slug, false, runId);
        throw caught;
    }
}
