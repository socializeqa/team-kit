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

## What is deliberately not here

The admin UI kits. A restaurant's panel and a decoration company's panel are
meant to look nothing alike; forcing one design on both would be a rewrite that
buys nothing. This package is the pipes, not the paint.

## House rules it encodes

- **Telegram is internal, WhatsApp is for clients.** Never the reverse.
- **Acceptance is not delivery.** A message id proves Meta took it, not that it
  arrived — confirm on the device or via the delivery webhook.
- Outside the 24-hour service window, only an **approved template** will send.
