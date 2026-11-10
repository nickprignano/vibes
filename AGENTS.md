# Instructions for AI assistants

Vibes is an original screensaver page: plain JavaScript and canvas, no build step, served as
static files. It plays the line-art library in prignano-theme (`art/`). The plan is in
[docs/SPEC.md](docs/SPEC.md); read it first.

- It's original work under the MIT license. No names, art, sounds or trademarks from screensaver
  products or toys; the words test keeps the banned names out of shipped files.
- Made for all ages. Keep the safety rules in the spec true: no flashes, the stripe-pattern
  limits, Calm and reduced motion. Styles live in prignano-theme and change there, after its flash
  scan passes.
- Nothing leaves the device: no analytics, accounts, server or network calls beyond the pinned
  theme files.
- Never put API keys, account or tenant IDs, domains other than the app's own, IPs, emails,
  secrets, or employer, customer or private-project names in the repo, commits, issues or PR
  text.
- Never ask for, show or store a secret in chat. The owner runs the step that handles it.
- Propose changes as pull requests. Never change a real account, deployment or spend setting
  without the owner's explicit yes.

## How to make a change

Four rules after the community "Karpathy guidelines" (MIT), reworded for agents that work unattended.

- Say what you assumed. When the ask leaves a detail open, pick the reasonable default, say which,
  and keep going. Stop to ask only when the choice changes the goal, something the owner will
  notice, or a step no one can undo; if no one is there to answer, do the reversible part and leave
  the question in the PR body. If a simpler way exists than the one asked for, say so.
- Write the least code that does the job: no features, options or abstractions nobody asked for,
  and no handling for cases that can't happen.
- Touch only what the task needs and match the style around it. Every changed line should trace
  back to the ask. Mention unrelated dead code instead of deleting it; remove only what your own
  change left unused.
- Before you start, name the check that proves the task is done (a failing test, the "Checks to
  run" below, an expected output), and don't call it done until it passes in front of you.

## Checks to run

```bash
node tools/sw-version.mjs   # after changing any file the site serves, or the theme pin
node --test
```
