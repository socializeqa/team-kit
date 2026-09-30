# @socialize/team-kit

The plumbing every [Socialize](https://socialize.qa) project shares — WhatsApp
Cloud API, Telegram, and the phone and money helpers a Qatari agency needs.

Renamed from `@socialize/fleet-kit` on 13 September 2026 (v2.0.0). Nothing
else changed in that release: the old install address keeps working through
GitHub's redirect, and the `fleet-changelog` command stays as an alias of
`team-changelog` until every project has switched.

Three of our projects had each written the WhatsApp sender separately. That is
three places to fix a Graph version bump and three chances to get a template's
parameter order wrong. This is those three, once.

## Install

```bash
pnpm add github:socializeqa/team-kit
```

`dist/` is committed and compiled with `pnpm compile`. There is deliberately
no `build`, `prepare` or install script: npm rebuilds any GitHub dependency
that has one, installing the kit's own dev tools on every consumer's install.
That broke Elite Touch's CI from 3 Sep 2026, when Vitest 5 shipped and npm 10
crashed resolving Vitest 4's add-ons. Change `src/`, run `pnpm compile`, and
commit `dist/` with it.

## Use

Configuration is passed in, never read from the environment — one of our
projects resolves credentials per branch at request time, and only the caller
knows which line is speaking.

```ts
import { whatsapp, telegram, phone, money } from "@socialize/team-kit";

const line = {
  token: process.env.META_SYSTEM_USER_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID!,
};

// Business-initiated: an approved template, outside the 24-hour window.
await whatsapp.sendTemplate(line, "+974 5036 8805", {
  name: "doc_ready",
  body: ["Sara", "invoice INV-2026-014", "QAR 1,200, due 15 Aug"],
  urlSuffix: publicToken,
});

await telegram.send({ token: process.env.TELEGRAM_BOT_TOKEN! }, {
  chatId: partnersRoom,
  emoji: "💰",
  title: "Payment received",
  lines: [{ label: "Invoice", value: "INV-2026-014" }],
});

phone.format("97450368805");   // "+974 5036 8805"
money.qarInWords(1250);        // "Qatari Riyals One Thousand Two Hundred Fifty Only"
```

Nothing throws. Sends answer with `{ ok, id?, error? }` — a message that fails
must never take down the work that asked for it.

## Telling HQ (the Telegram hub)

An app does not keep a bot of its own. It tells Socialize HQ what happened,
and HQ's bot says it in the project's topic of our team group and in the
client's own group, where their owners and staff read it. Guests and
customers stay on WhatsApp. The key is made in HQ → Settings → Telegram →
Projects.

```ts
import { notify } from "@socialize/team-kit/notify";

await notify({ key: process.env.SOCIALIZE_NOTIFY_KEY! }, {
  to: "both",                  // "team" | "client" | "both"
  key: "booking.cancelled",    // the app's own name for the event
  emoji: "❌",
  title: "Booking cancelled by the guest",
  subtitle: "West Bay · Sam, 6 guests, tonight 9 PM",
  about: { kind: "booking", id: booking.id }, // later news of it answers under it
  follow: "reply",
});
```

`notify` answers `{ ok, sent, missing }`: `sent` counts the rooms Telegram
really took it in, and `missing` names each room that was not there or
refused it ("Señorritas Tex Mex has no group for money"). HQ books every
one of those as a failed message, so nothing is lost in silence.

**A client's groups per stream.** A client can keep money and hiring (an
applicant's phone and email) away from the floor staff with a group for
each, besides their group for all. Name the stream, or let the key's first
word decide (`payment.`, `invoice.`, `credit.`, `money.` → money; `hiring.`,
`application.` → hiring; the rest → ops). A stream with no group of its own
goes to the group for all.

```ts
const hub = { key: process.env.SOCIALIZE_NOTIFY_KEY! };
await notify(hub, { to: "client", key: "application.new", title: "New CV: Line cook" }); // → their hiring group
await notify(hub, { to: "client", key: "shift.swap", stream: "ops", title: "Sara swapped Friday" });
```

### Buttons back to the app (v2.8.0)

An event can carry up to three buttons. When someone in the room presses
one, HQ posts the press to the app's **callback**, signed, and shows the
app's answer under the message: "✅ Booking confirmed — Sam, 14:05", the
buttons gone. Anyone who can see the message may press (the group is the
trust boundary); HQ names them in the press. A button works once, for a
week. The callback address and its secret are set in HQ → Settings →
Telegram → Projects (the secret is shown once: keep it as
`SOCIALIZE_PRESS_SECRET`). Without a callback, events still go out and
their buttons are dropped.

```ts
await notify(hub, {
  to: "both",
  key: "booking.new",
  title: "New booking",
  subtitle: "West Bay · Sam, 6 guests, tonight 9 PM",
  about: { kind: "booking", id: booking.id },
  buttons: [
    { label: "Confirm", action: "booking.confirm", payload: { booking: booking.id }, style: "go" },
    { label: "Decline", action: "booking.decline", payload: { booking: booking.id }, style: "stop" },
  ],
});
```

A label is at most 32 letters, an action is lowercase letters, digits,
dots, dashes and underscores (`booking.confirm`), and a payload is a JSON
object of at most 1 KB.

The callback, a Next.js route (`app/api/socialize/press/route.ts`):

```ts
import { verifyPress, type PressAnswer } from "@socialize/team-kit/press";

export async function POST(request: Request) {
  // The body exactly as it arrived: the signature is over these bytes.
  const raw = await request.text();
  const press = verifyPress(raw, request.headers, process.env.SOCIALIZE_PRESS_SECRET ?? "");
  if (!press) return Response.json({ ok: false }, { status: 401 });

  const by = `${press.by.name} via Telegram`;
  let answer: PressAnswer;
  switch (press.action) {
    case "booking.confirm": {
      const booking = await confirmBooking(String(press.payload.booking), { by, pressId: press.id });
      answer = booking ? { ok: true, text: "Booking confirmed" } : { ok: false, text: "That booking was already cancelled" };
      break;
    }
    case "booking.decline":
      await declineBooking(String(press.payload.booking), { by, pressId: press.id });
      answer = { ok: true, text: "Booking declined" };
      break;
    default:
      answer = { ok: false, text: "This app doesn't know that button" };
  }
  return Response.json(answer);
}
```

- **Answer within eight seconds**, `{ ok, text? }`. `ok: true` settles the
  message; `ok: false` keeps the buttons and shows `text` to the presser, so
  say why. No answer, a timeout or a non-2xx keeps the buttons too, tells the
  presser "Couldn't reach …" and reaches HQ's Sentry.
- **Make each action safe to repeat.** A press id comes once, but the same
  event said in two rooms has a button in each, and a person may press the
  second after the first. Keep `press.id` with what it did, or check the
  state before acting, as above.
- `verifyPress` checks the `x-socialize-signature` header (`sha256=` and the
  hex HMAC-SHA256 of the raw body with the secret, compared in constant
  time) and refuses a press older than five minutes by
  `x-socialize-timestamp` and by its own signed `at` (`maxAgeSeconds` to
  change it). It uses Node's crypto: call it from a server route.

## Asking a model

Every AI call in every app goes through one door: OpenRouter, strict JSON
against a schema, nothing kept or trained on, and a second model when the
first fails. The key and the kill switch come from the app.

```ts
import { askForJson, MODELS } from "@socialize/team-kit/ai";

const reply = await askForJson<{ text: string }>(
  { key: process.env.OPENROUTER_API_KEY ?? "", onError: report },
  { models: [MODELS.writer, MODELS.careful], system, prompt, schema },
);
if (!reply) return; // slow, broken or switched off: carry on without it
```

A client's app asks **through Socialize** instead, and holds no AI key: HQ
makes the call on its own account, records what it cost against the client
and bills it on their statement at cost + 30% (30 September 2026). The key is
the app's hub key; `purpose` names the statement line. A large PDF goes as a
short-lived signed link, never as base64 (a function takes 4.5 MB).

```ts
import { askViaHq, MODELS } from "@socialize/team-kit/ai";

const read = await askViaHq<Screen>(
  { key: process.env.SOCIALIZE_NOTIFY_KEY ?? "", onError: report },
  { purpose: "CV screening", models: [MODELS.careful], system, prompt, schema,
    files: [{ filename: "cv.pdf", url: signedUrl }] },
);
```

## Reading the client's brain

What we know about a client (rules, facts, voice, words never said, staff
names, answers) is kept once, in HQ's Brain room. An app reads its own
client's brain with the same key it tells HQ with; it can read no other.

```ts
import { readBrain } from "@socialize/team-kit/brain";

const brain = await readBrain({ key: process.env.SOCIALIZE_NOTIFY_KEY! }, { branch: "West Bay" });
const system = brain.ok ? `${houseRules}\n\n${brain.text}` : houseRules;
```

## Answering the client's Google reviews

HQ pulls each location's Google reviews through Metricool every half hour
and drafts every reply from the client's brain. A client's own panel reads
the same reviews with its hub key and answers them: every press names the
person who made it, and HQ's Reviews room sees the same rows.

```ts
import { pressReview, readReviews, monthlyScores } from "@socialize/team-kit/reviews";

const key = process.env.SOCIALIZE_NOTIFY_KEY!;
const { reviews = [] } = await readReviews({ key });
await pressReview({ key }, { action: "save", id, reply, lesson: "Never call the brunch cheap", by: "Dina" });
await pressReview({ key }, { action: "post", ids: [id], by: "Dina" }); // read back from Google before it says posted
const trend = monthlyScores(reviews.filter((r) => r.place === "West Bay"), 12);
```

## Keeping keys out of Sentry

Some addresses are keys: a client's paper, a customer's tracker, an invite
link. A report that keeps the address keeps the key. Each app names its
keyed addresses once and hands the scrubber to every `Sentry.init`.

```ts
import { onKeyedPage, scrubber, type ScrubRules } from "@socialize/team-kit/scrub";

const KEYED: ScrubRules = { paths: ["/track/", "/account/"], hosts: ["portal."], query: ["code", "token"] };
const scrub = scrubber(KEYED);

Sentry.init({ dsn, beforeSend: scrub, beforeSendTransaction: scrub });
// In the browser, film no replay where the address is the key:
if (!onKeyedPage(KEYED, window.location)) Sentry.addIntegration(Sentry.replayIntegration());
```

## Scheduled jobs

```ts
import { watched } from "@socialize/team-kit/cron";

return watched(
  { healthchecks: { pingKey: process.env.HEALTHCHECKS_PING_KEY ?? "" } },
  "socialize-finance-sweep",
  "0 5 * * *",
  () => run(),
);
```

`watched` pings Healthchecks.io at the start and the end of the run
(`/fail` on a throw or a 5xx) with one run id on both, so a job that never
starts, never finishes or fails raises an alert on the check. The check
itself — its cron schedule and grace — is created once through the
Healthchecks API; the slug here names it. Passing `dsn` as well reports to
Sentry Crons too; the team stopped relying on it in September 2026 because
Sentry's free plan keeps one cron monitor switched on per organisation.

## What is deliberately not here

The admin UI kits. A restaurant's panel and a decoration company's panel are
meant to look nothing alike; forcing one design on both would be a rewrite that
buys nothing. This package is the pipes, not the paint.

## House rules it encodes

- **Telegram is for us and our clients (owners and staff); WhatsApp is for
  their guests and customers.** Never the reverse (29 September 2026).
- **Acceptance is not delivery.** A message id proves Meta took it, not that it
  arrived — confirm on the device or via the delivery webhook.
- Outside the 24-hour service window, only an **approved template** will send.
