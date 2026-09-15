# What's the Call? Baseball

A rules training app for Little League baseball umpires, coaches, and parents.

**[Download on the App Store](https://apps.apple.com/us/app/whats-the-call/id6761323772)** · [Google Play](https://play.google.com/store/apps/details?id=com.allenca21.whatsthecall)

Current version: 3.0.1

---

## What it does

Most baseball rules resources are reference documents. You look something up
after the play is over. That is not how officiating works — the call happens in
about two seconds, under pressure, with a parent yelling from the third base
line.

What's the Call? drills the decision instead of the citation. Each question puts
you in a real situation, you make the call, and then you get the rule that
governs it. The goal is recall speed, not reading comprehension.

Three modes:

- **Quiz** — situational questions organized by rulebook chapter
- **Live Call** — rapid-fire scenarios that mirror in-game decision pressure
- **Rule Library** — the reference layer, for when you want to read the rule
  rather than be tested on it

## Why I built it

I umpire Little League baseball. The gap I kept running into was
that new umpires study the rulebook, pass the test, and then freeze on the field
the first time they get a genuine oddity — an infield fly with a runner
interfering, a catch-and-carry near the dugout, an appeal play nobody at the
plate meeting anticipated.

The question bank is written from that experience rather than paraphrased from
the rulebook. Scenarios reflect situations that actually come up and actually
get called wrong.

Rules content is validated against the current Little League rulebook and
umpire's manual. It is a study aid, not an official publication, and it is not
affiliated with or endorsed by Little League International.

## Built with

- **React Native / Expo** — single codebase, iOS and Android
- **EAS Build & Submit** — build pipeline and store delivery
- **RevenueCat** — in-app purchases and entitlement management, with
  platform-aware configuration so one `pro` entitlement covers both stores
- **AsyncStorage** — local progress tracking, no account required

The app collects no personal data and requires no sign-in. Progress lives on the
device.

## Project structure

```
App.js                 Screens, navigation, and app state
questionBank.js        Situational questions, organized by chapter
referenceLibrary.js    Rule reference content
app.json               Expo configuration
eas.json               Build and submit profiles
```

It is a deliberately flat project. The app is content-heavy and logic-light, so
the complexity lives in the question bank rather than in the architecture.

## The rest of the suite

Same engine, different rule sets:

- [What's the Call? Fast Pitch](https://apps.apple.com/us/app/whats-the-call-fast-pitch/id6762152590) — USA Softball rules
- [What's the Call? Flag Football](https://apps.apple.com/us/app/whats-the-call-flag-football/id6761696510)

## Status

Live on the App Store and Google Play. Actively maintained.

Source is published for portfolio purposes.

---

© 2026 Clark Allen. All rights reserved.

This source is made publicly viewable to demonstrate my work. It is not licensed
for reuse, redistribution, or derivative works. Rules content and question banks
are original writing and are not to be copied.
