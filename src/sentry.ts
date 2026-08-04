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
 * Built from the DSN so there is one source of truth for the project. The
 * caller passes it, like every other config in this kit — reading the
 * environment here would tie the package to Node and to one variable name.
 */
function checkInUrl(config: CronConfig, slug: string): string | null {
  // https://<key>@o<org>.ingest.<region>.sentry.io/<project>
  const parts = config.dsn?.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)\/?$/);
  const [, key, host, project] = parts ?? [];
  if (!key || !host || !project) return null;
  return `https://${host}/api/${project}/cron/${slug}/${key}/`;
}

async function post(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // A slow check-in must never hold up the work it is reporting on.
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Losing a check-in is not worth failing the job over.
  }
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
export async function jobStarted(
  config: CronConfig,
  slug: string,
  schedule: string,
): Promise<void> {
  const url = checkInUrl(config, slug);
  if (!url) return;
  await post(url, {
    status: "in_progress",
    monitor_config: {
      schedule: { type: "crontab", value: schedule },
      // Vercel fires crons on a best-effort basis and the drift is real: a
      // 05:00 sweep checked in at 05:34 on its first live morning, already
      // past a 30-minute margin. An hour is wide enough that lateness never
      // pages anybody, and still narrow enough that a job which simply did
      // not run is caught the same day.
      checkin_margin: 60,
      max_runtime: 30,
      timezone: "Etc/UTC",
    },
  });
}

/** Close the loop. `ok: false` raises the job as failed rather than missed. */
export async function jobFinished(
  config: CronConfig,
  slug: string,
  ok: boolean,
): Promise<void> {
  const url = checkInUrl(config, slug);
  if (!url) return;
  await post(url, { status: ok ? "ok" : "error" });
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
export async function watched(
  config: CronConfig,
  slug: string,
  schedule: string,
  job: () => Promise<Response>,
): Promise<Response> {
  await jobStarted(config, slug, schedule);
  try {
    const response = await job();
    await jobFinished(config, slug, response.status < 500);
    return response;
  } catch (caught) {
    await jobFinished(config, slug, false);
    throw caught;
  }
}
