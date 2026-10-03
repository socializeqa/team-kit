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
money.qarInWordsAr(1250);      // "فقط ألف ومائتان وخمسون ريالاً قطرياً لا غير" (v2.9.0)
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

### A group per branch (v2.10.0)

A client with more than one branch keeps a Telegram group for each branch's
staff and one for management (owners and managers, all branches). HQ holds
the branch keys for the client (Settings → Telegram → Projects, the
project's branches); the app names the branch an event belongs to with
`scope`, using the same key: lowercase letters, digits and dashes
(`SCOPE_KEY`), usually the branch's own slug.

- **With a `scope`**: the branch's group hears it (its stream's group for
  that branch, else that branch's group for all) and so does management (its
  stream's group, else its group for all). Buttons go up in the branch's
  group only; management's copy says where they are.
- **Without one**: management alone hears it, buttons and all. Use this for
  news that belongs to no branch (a broadcast finished, what's new in the
  app).
- A key HQ does not hold for the client is dropped (named in HQ's answer and
  told to our team) and the event goes as if it had none, so nothing is
  lost. A branch with no group yet is named in `missing`.

Señorritas Tex-Mex, with Al Sadd and West Bay:

```ts
const hub = { key: process.env.SOCIALIZE_NOTIFY_KEY! };

// Al Sadd's staff and management hear it; Confirm and Decline sit in Al Sadd's group.
await notify(hub, {
  to: "both",
  key: "booking.new",
  scope: booking.branch.slug, // "al-sadd"
  title: "New booking",
  subtitle: "Sam, 6 guests, tonight 9 PM",
  about: { kind: "booking", id: booking.id },
  buttons: [
    { label: "Confirm", action: "booking.confirm", payload: { booking: booking.id }, style: "go" },
    { label: "Decline", action: "booking.decline", payload: { booking: booking.id }, style: "stop" },
  ],
});

// One digest per branch, each to its own branch (and management).
for (const branch of branches) {
  await notify(hub, { to: "client", key: "digest.daily", scope: branch.slug, title: `${branch.name} today`, tier: "silent" });
}

// No branch: management only.
await notify(hub, { to: "client", key: "broadcast.finished", title: "The October offer reached 1,240 guests" });
```

`missing` then names a branch's group the way HQ says it ("Señorritas Tex
Mex has no Al Sadd group for operations") and management's as "management
group", so an app that falls back to WhatsApp when its floor did not hear
can tell the two apart.

### One design for every card (v2.11.0)

HQ lays every Telegram message out the same way, the house's and every
app's: the emoji and a bold title, a one-line summary in italics, a fact a
line ("emoji, two spaces, the value"), the smart lines, the status in bold,
the long part folded away, the tags last. Never monospace. An event fills
the parts it has:

```ts
await notify(hub, {
  to: "both",
  key: "booking.new",
  scope: "west-bay",
  emoji: "🍽️",
  title: "New booking · West Bay",
  subtitle: "Table for 4, tonight at 20:30",
  lines: [
    { icon: "👤", label: "Sara Al-Kuwari" },          // a label alone stands bold
    { icon: "📞", value: "+974 5500 0000" },
    { icon: "👥", value: "4 guests · 🎂 birthday" },
    { icon: "💬", value: "“Window table if possible”" }, // in quotes: italics
  ],
  context: [
    { icon: "⭐", value: "Returning guest — 3rd visit, last on 12 Sep" },
    { icon: "📊", value: "Tonight at West Bay: 18 bookings · 64 guests" },
  ],
  status: "⏳ Waiting for approval",
  details: { title: "🧾 Guest history", lines: ["12 Sep — 2 guests, arrived", "28 Aug — 4 guests, arrived"] },
  about: { kind: "booking", id: booking.id },
});
```

which Telegram shows as

```
🍽️ New booking · West Bay
Table for 4, tonight at 20:30

👤  Sara Al-Kuwari
📞  +974 5500 0000
👥  4 guests · 🎂 birthday
💬  “Window table if possible”

⭐  Returning guest — 3rd visit, last on 12 Sep
📊  Tonight at West Bay: 18 bookings · 64 guests

⏳  Waiting for approval
┃ 🧾 Guest history            (folded until tapped)
┃ • 12 Sep — 2 guests, arrived
#SenorritasTexMex  #WestBay
```

`tags` adds hashtags after the client's (the branch's own comes from
`scope`). Sizes are cut, never trusted: six `context` lines, a 120-letter
`status`, 40 `details` lines of 300, four `tags`. A card past Telegram's
4,096 characters gives way from the folded part first.

### Living cards (v2.11.0)

A booking used to be a new message for every step. With `follow: "update"`
and the same `about`, HQ rewrites the card it already said in each room:
the update's `status` replaces the status line and its `timeline_line` is
added under the facts. A new status means the thing moved on, so the
buttons that asked about it come down (the links stay) unless the update
brings its own; an update with only a line keeps everything. With no card
to rewrite (none yet, or deleted by hand), the update is said as a card of
its own.

```ts
// Approved in the app: the card in Al Sadd's group, management's and our topic all say so.
await notify(hub, {
  to: "both",
  key: "booking.approved",
  scope: booking.branch.slug,
  title: "Booking approved",
  about: { kind: "booking", id: booking.id },
  follow: "update",
  status: "✅ Approved",
  timeline_line: `✅ Approved by ${staff.name} · ${clock(now)}`,
});

// A line only: the status and the buttons stay.
await notify(hub, { to: "client", key: "booking.reminded", scope, title: "Reminder sent", about, follow: "update", timeline_line: "📩 Reminder sent · 19:45" });
```

A press on the card settles it the same way: the app's answer becomes a
line of its timeline ("✅ Booking confirmed · Sam · 14:05").

### "I'll handle it" and escalation (v2.11.0)

`claim: true` adds a **🙋 I'll handle it** button where the buttons go (the
client's own group, the branch's when scoped). The first to press takes
it: the card's status becomes "🙋 Dina is handling it · 18:02" and the
button comes down. HQ answers it itself; the app is not called.

`escalate: { after_minutes }` (5 to 120, only with buttons or the claim)
says how long the card may wait for a press. Past it HQ posts one nudge
under the card ("⏰ Still waiting — 10 min"); after twice as long it tells
the client's management group (for a branch's card) and our team, without
buttons. A press, a claim or an update with a new status stops it. Never
in the client's quiet hours unless the event is `urgent`.

```ts
await notify(hub, {
  to: "both",
  key: "booking.new",
  scope: booking.branch.slug,
  title: "New booking",
  about: { kind: "booking", id: booking.id },
  buttons: [{ label: "Approve", action: "booking.approve", payload: { booking: booking.id }, style: "go" }],
  claim: true,
  escalate: { after_minutes: 10 },
});
```

### Buttons back to the app (v2.8.0)

An event can carry up to three buttons. When someone in the room presses
one, HQ posts the press to the app's **callback**, signed, and writes the
app's answer on the card: "✅ Booking confirmed · Sam · 14:05", the
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

### HQ asking the app (v2.12.0)

Some numbers live only in the client's app: the bookings a restaurant took,
the requests a company logged. HQ keeps no copy; when the monthly report is
prepared on the 5th it asks the app, and the app answers from its own
records. The question goes to `/api/hub/ask` on the host of the app's
callback, signed with the same callback secret as a press, and the answer
comes back as JSON within twenty seconds.

```ts
// app/api/hub/ask/route.ts
import { askedMonth, verifyAsk, BOOKINGS_QUESTION, type AskAnswer, type BookingRow } from "@socialize/team-kit/ask";

export async function POST(request: Request) {
  const raw = await request.text(); // before any JSON parsing: the signature is over these bytes
  const ask = verifyAsk(raw, request.headers, process.env.SOCIALIZE_HUB_CALLBACK_SECRET ?? "");
  if (!ask) return Response.json({ ok: false, error: "unsigned" }, { status: 401 });

  if (ask.question === BOOKINGS_QUESTION) {
    const month = askedMonth(ask.payload);
    if (!month) return Response.json({ ok: false, error: "no month" }, { status: 400 });
    const rows: BookingRow[] = await bookingsFor(month); // that month and the month before
    return Response.json({ ok: true, data: { rows } } satisfies AskAnswer);
  }
  return Response.json({ ok: false, error: `unknown question ${ask.question}` }, { status: 400 });
}
```

- **`report.bookings`**, payload `{ month: "2026-09" }`: the bookings made
  in that month and the month before (Doha time, by the day each was
  made), one `BookingRow` per month, branch, door and campaign tag. HQ adds
  them up for the report: by branch, by door, by campaign, and the cost of
  a booking from each paid door.
- Read-only, so answering the same question twice is harmless. Answer only
  aggregates: no guest's name, phone or email ever leaves the app.
- `verifyAsk` checks the signature and the clock the way `verifyPress`
  does (five minutes by default).

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
