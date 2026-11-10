# Vibes spec (v1)

Status: approved by the owner (2026-11-09) after two Fable red-team passes. The art library and
the prignano.ai card switch are merged; this repo holds the player. Name **Vibes**, at `vibes.prignano.ai` (owner's pick,
2026-11-09). Sound (v2) built 2026-11-10: see "v2: sound".

## What it is

A full-screen page that plays our line art forever, like an old-school screensaver: a piece
grows in, drifts for a while, then dissolves into the next. It never ends and never repeats
exactly. You can step through pieces, pause one you like, go full screen, or install it and leave
it running on a spare screen.

It is a toy, not a game: no score, no goal. v1 is silent; v2 adds ambient sound.

## Where "our line art" lives (checked 2026-11-09)

The line art is generative, not image files. `app/project-art.tsx` in `prignanodotai-web` draws
every project and event card on prignano.ai in one of three styles, seeded by the repo name and
colored by its language:

| Style | What it looks like |
|---|---|
| Flow trails | Hundreds of fading comet lines drifting through a slowly turning field |
| Wave lines | Stacked lines rippling like a sound wave, peaked in one band |
| Harmonograph | Two looping pendulum curves, decaying inward, slowly turning |

prignano-theme has colors and the header, no art. So v1 plays these three styles full screen,
with endless random seeds and hues.

## Decisions so far

| Question | Answer |
|---|---|
| Where it lives | Its own repo and `vibes.prignano.ai` (owner's pick): plain JavaScript, no build step, Cloudflare Workers static assets, installable, same recipe as the games |
| Art code | One shared style library in **prignano-theme** (`art/`), plain JS, MIT, tagged like the rest of the theme. Vibes and the prignano.ai cards both draw from it, so there is one copy of every style |
| License | MIT, the theme's license. The three site styles move from `prignanodotai-web` (no license; the owner wrote them) into the theme under its MIT license |
| How often it changes | A new piece every 45 seconds, with a 3-second cross-dissolve |
| Which art | Only the website's line art in v1 (owner's pick, 2026-11-09) |
| Listed where | prignano.ai's Projects carousel picks it up on its own as a public repo. No /games card, since it isn't a game (default) |

## What you see and do

1. **Open.** A piece starts right away. A small bar along the bottom has previous, pause, next,
   Calm, Keep screen on, full screen and About. The bar and cursor hide after 3 seconds without
   input and come back on any mouse move, tap or key.
2. **Watch.** Each piece grows in over 3 seconds (curves trace along their path, waves rise
   from flat, trails start empty). Colors drift slowly around the
   wheel. After 45 seconds the piece cross-dissolves into the next.
3. **Steer.** Left and right arrows or a swipe: previous and next. Space: pause (the piece holds
   still and the cycle stops). F or double-click: full screen. C: Calm. Escape leaves full
   screen.

## The pieces

Each style has three parts: a pure parameter function (seed in, size-free numbers out), a pure
geometry function (parameters, size and time in, polylines out), and a stroke function that draws
those polylines. The first two are tested in Node. Every style declares a
**pattern class**: *free* (no repeating stripes or grid) or *periodic* (parallel lines, a grid or a
repeating tiling), and periodic styles must stay inside the limits under Safety. Periodic styles,
and free styles with local parallel lines (rhomb and hyperbolic tilings), carry a *has stripes*
flag and must stay inside the limits under Safety. Each style also says how it grows in over its
first 3 seconds. The grow-in plays only in Vibes' live loop: the **still frame** (cards that
aren't active, reduced motion, first paint) is always the settled piece at 10 seconds, never a
blank.

**18 styles in v1.** The owner asked for a dozen or more, mostly geometric line-art patterns with
advanced shapes (2026-11-09). The first three are ported from the site; the other fifteen are new,
written fresh in the same look: thin glowing strokes on a dark gradient.

| # | Style | What it looks like | Grows in by | Class |
|---|---|---|---|---|
| 1 | Flow trails (port) | Hundreds of comet lines drifting through a slowly turning field; particle count scaled for full screen | Trails start empty | free |
| 2 | Wave lines (port) | Stacked lines rippling like a sound wave | Waves rise from flat | periodic |
| 3 | Harmonograph (port) | Two looping pendulum curves decaying inward, slowly turning | Tracing | free |
| 4 | Gear curves | Rolling-circle curves (hypotrochoids and epitrochoids) with high-order ratios, traced one at a time, a new ratio starting when one closes | Tracing | free |
| 5 | Rose | Rose curves with fractional petal ratios (like 5/7) that weave into lace, offset from the centre so petals don't all meet in a hub, slowly turning | Tracing | free |
| 6 | Knot | Torus knots and 3D Lissajous knots rotating in space, nearer strands brighter | Tracing | free |
| 7 | Wire solids | Polyhedra in wireframe: Platonic and Archimedean solids, stellations and compounds (like five interlocked tetrahedra), turning on two axes | Edges drawing on | free |
| 8 | Attractor | A 3D strange attractor (Lorenz, Thomas or Aizawa type) as one long thread (at most 20,000 points, 3,000 on a card), rotating about an axis off its lobes | Thread growing | free |
| 9 | Times tables | Chords joining point *n* to point *n × k* around a circle; *k* creeps up (at most 0.01 a second) so cardioids, nephroids and star webs morph into each other; at most 120 faint chords | Chords appearing | free |
| 10 | Star polygons | Star polygons ({7/2}, {9/4}, {12/5} and so on) in at most three rings, well apart, turning slowly the same way | Edges drawing on | free |
| 11 | Circle lattice | Overlapping equal circles in a hexagonal pattern, at most three rings of them, with the stars and hexagons they imply drawn over them | Circles tracing | periodic |
| 12 | Star tiling | Islamic-style 8- and 12-fold star tilings (square and hex lattices) drawn as single lines (built: interlaced bands would double the stripes), panning one way, not rotating | Lines drawing on | periodic |
| 13 | Rhomb tiling | An aperiodic (Penrose-type) rhomb tiling, edges only, zooming slowly (doubling every 45 to 70 seconds, built slower than 30 to pass the motion rule); new edges fade in over 2 seconds so nothing pops | Fading up | free, has stripes |
| 14 | Hyperbolic | A Poincaré-disc tiling ({7,3}, {5,4} and others) built once, then gliding (one transform a frame); edges too short for the spacing rule are dropped before they crowd at the rim | Fading up | free, has stripes |
| 15 | Voronoi | Cell edges of up to 150 slowly drifting points, with the matching triangle mesh as a fainter layer | Fading up | free |
| 16 | Fractal curves | Gosper, dragon and Koch curves drawn one segment at a time, then dissolving to one level deeper, stopping while lines are still 4% of the height apart | Drawing | periodic |
| 17 | Meander | Tiles of quarter circles forming winding paths (a Truchet pattern); one tile turns at a time | Fading up | periodic |
| 18 | Epicycles | A chain of spinning circles (a Fourier series) drawing closed shapes, starting with the site's own wave icon | Tracing | free |

Ported styles keep the site's look but are tuned for a big screen: flow trails scale their
particle count with area up to a full-screen cap (not the card's 900) and skip the pre-run in the
live loop (the still frame keeps it), and wave lines follow the stripe limits.

**Order:** the cycle shuffles all 18 and plays each once before reshuffling, never the same style
twice in a row, each time with a new random seed and hue.

**Color:** line colors are set in OKLCH, so lightness means perceived brightness at every hue,
and the palette drifts around the hue wheel at most one full turn every 3 minutes.

## The cards on prignano.ai (owner's ask, 2026-11-09)

The project and event cards stop repeating the same three styles. They use the same 18-style
library:

- `app/project-art.tsx` becomes a thin wrapper around the theme's library: a new `style` prop,
  the same "only the active slide animates" and reduced-motion rules, the same per-repo colors.
- **Pick:** `pick(seeds)` in the library runs in the parent (carousel, projects page, events
  page) and passes each card its style. Each repo's style comes from its name (a hash, as now),
  so a project always looks the same. Where two cards next to each other in list order get the
  same style, the second moves to the next style, so neighbours never match. A card's style can
  change only when the list order changes and a new clash appears.
- The cards use the library's card setting: the same safety limits, with lighter work (fewer
  particles and lines) for small canvases.
- Styles too busy for a small card can opt out with a `card: false` flag; the pick skips them.

## Safety

Trippy must never mean flashing. Each rule is backed by a unit test or the flash scan.

### No flashes

- Aim: zero flashes, well under the WCAG 2.3.1 limit of three a second. Nothing flashes saturated
  red.
- Transitions: a 3-second cross-dissolve, except between two periodic styles, which fade out to
  the background and back in (at least 1.5 seconds each way), because two overlapping grids are
  the moiré case.
- Auto-advance never runs faster than once every 20 seconds, whatever the settings.
- No additive afterimage or feedback effects in v1 (they build up toward white, then drop at
  each change).

### No harmful patterns

Regular stripes, grids and tilings are the other trigger besides flashing (Ofcom / ITU-R BT.1702
pattern guidance), and several new styles are periodic. Limits, checked by the parameter test
for 1,000 seeds at 390x844, 1280x720 and 3840x2160, for every periodic style:

- The repeat (line spacing, or tile size for tilings) is at least 4% of the screen height
  (29 px at 720p), so at most about 25 lines across the screen.
- Lines stay thin (at most 0.3% of the height) and faint: at most 4:1 luminance contrast against
  the background in full screen, checked at every hue. The broadcast guidance counts more than
  five stripe pairs as a risk at high contrast; Vibes relies on thin, low-contrast lines and slow
  one-way motion to stay well clear, and says so rather than claiming the count.
- Motion goes one way and slowly: the fastest-moving point of any periodic pattern (including
  the corners of a turning one) travels less than half a repeat a second. In practice periodic
  styles turn at most once every 5 minutes; free 3D shapes can turn faster.
- Fractal curves stop a level early rather than break the spacing rule; rhomb and hyperbolic
  tilings drop edges shorter than the minimum.
- Free styles have a density cap instead: the Node test rasterises each style's polylines into a
  coarse grid and fails if too many cells are crossed by too many lines, so lace-like curves
  (rose, times tables, gear curves) stay readable rather than shimmering.
- No concentric rings, tunnels, rotating spirals, radial starbursts, or two overlapping line
  grids (the moiré case), including during transitions.

### Flash scan

`tools/flash-scan.mjs` in prignano-theme (Playwright, run before each PR that adds or changes a
style, not in CI; it ships in the first library PR, with a bare test page, so styles are scanned
before Vibes exists): a test hook steps the loop
with a fixed 1/60 s time step and captures every rendered frame at 1280x720, for each style at
three seeds plus Vibes' transitions, 20 seconds each. Each frame's relative luminance is binned in
a 16x9 grid. A flash is a pair of opposing swings of 10% or more (darker state under 0.8) whose
changed cells add up to more than a quarter of a 10-degree field (WCAG's 341x256 px at
1024x768, scaled). Red flashes are counted the same way on saturated red. The scan must report
zero of both. The counter itself is pure and unit-tested on known sequences.

### Reduced motion and Calm

- `prefers-reduced-motion`, watched live (the port checks it once; Vibes listens for changes):
  each piece is a still frame, auto-advance is off, previous and next swap pieces instantly.
- **Calm** switch for anyone without the OS setting: half speed, lower line contrast, 90 seconds
  a piece.
- A one-line note on first open: "Moving patterns. Turn on Calm if motion bothers you." Shown
  once per device.

## Running on a spare screen

- **Keep screen on** (Screen Wake Lock API): on by default while full screen, so Windows
  doesn't blank the display after its idle timeout; off otherwise. It needs a click to start and
  is asked for again when the page becomes visible. Hidden where unsupported.
- Full screen needs a click or key every time (browsers require it). Installed on Windows, Vibes
  opens in its own window, not full screen, so you still press F.

## Battery and speed

- Draws only while the page is visible; stops the frame loop on `visibilitychange`.
- Canvas backing store capped at 2x pixel ratio and about 4 million pixels, so a 4K screen draws
  at lower resolution, upscaled.
- No `shadowBlur`.

## Look and accessibility

- Always dark: the art needs it. The bar uses prignano-theme tokens (dark values), loaded from a
  pinned commit like the games. No shared header on the art screen; About shows it.
- Canvas is `aria-hidden`. A visually hidden h1 names the page. Every control is a labelled
  button with a visible focus ring and a 44 px target, on a solid backing so its text meets
  contrast over any frame.

## Installable app

Pinball PR #7's recipe, as every game has it: manifest (`display: standalone`, any orientation),
original icons drawn from a harmonograph frame, a service worker caching every file with its list
stamped by `tools/sw-version.mjs`, a test that fails when the list is stale, and an update
button. Works offline.

## Data and privacy

Nothing leaves the device: no analytics, accounts, server or network calls beyond the pinned
theme files. Settings (Calm, Keep screen on, first-open note seen) are kept in `localStorage`,
wrapped so blocked storage just means defaults.

## Files

In **prignano-theme**:

```
art/index.js           style list, pick(seeds), card and full-screen settings (no CSS or header dependency)
art/index.d.ts         types for the TypeScript site
art/rng.js             seeded random numbers (from project-art.tsx)
art/styles/*.js        one file per style: params(seed) and geometry(...) (pure), stroke(...), class, grow-in
art/limits.js          stripe, contrast and density limits (pure)
art/flash.js           the flash counter (pure)
tools/flash-scan.mjs   with a bare test page
test/art.test.js       determinism, pattern and density limits, still frames not blank, pick never repeats a neighbour, flash counter
```

`package.json` gains an `"./art/*"` export and `art` in `files`; the README scope line and
`brand/profile.json` release are updated with each tag.

In the **vibes** repo (loads the theme's `art/` from the same pinned jsDelivr commit as the theme
CSS; `sw-version.mjs` lists those cross-origin files too, so offline works):

```
index.html
src/main.js            loop, input, bar, full screen, wake lock
src/cycle.js           timing, cross-dissolve, color drift, Calm and reduced-motion rules (pure)
tools/sw-version.mjs
sw.js, manifest.webmanifest, icons/
test/*.test.mjs
wrangler.jsonc, docs/DEPLOY.md
```

## Tests

`node --test`:

1. **Cycle:** never advances faster than every 20 seconds; dissolves last at least 1.5 seconds;
   color drift stays under its rate; reduced motion requests no animation frames.
2. **Determinism:** the same style and seed give the same parameters.
3. **Pattern limits:** as listed above, for 1,000 seeds at three sizes, normal and Calm.
4. **Transitions:** periodic to periodic goes through the background, never a cross-dissolve.
5. **PWA:** the service worker file list is current.
6. **No network:** shipped files contain no `fetch`, `XMLHttpRequest`, `WebSocket` or beacon
   calls outside `sw.js`.
7. **Words:** an encoded list of screensaver product names, toy trademarks and marked pattern
   names never appears in shipped files (like the games' words test). On screen the styles use
   plain names: gear curves, circle lattice, rhomb tiling.

The library's own tests (determinism, limits, density, still frames, pick, flash counter) live in
prignano-theme and run with its `npm test`.

## Pull requests

1. This spec.
2. **prignano-theme, art library:** `art/` with all 18 styles, the library tests, the flash scan
   and its test page, a new theme tag. (Built as one PR instead of two, for fewer, larger PRs.)
3. **vibes, build 1:** the player, cycle, transitions, controls, Calm, keep screen on,
   installable app, `docs/DEPLOY.md`; the scan re-run on Vibes' transitions.
4. **prignanodotai-web:** move the theme pin to the same commit Vibes pins, so both draw
   alike; `project-art.tsx` becomes the wrapper; the no-neighbour pick in the lists. A separate PR, not part of a Vibes build, because it is another repo
   with its own deploy, and the cards can switch as soon as the library has its styles.

Every PR that adds or changes a style opens only after the flash scan passes for it.

The owner creates the repo and adds the custom domain. Claude writes `docs/DEPLOY.md` and changes
nothing on the account without his yes.

## v2: sound (owner's ask, 2026-11-09; specced and built 2026-11-10)

The owner's ask (2026-11-10): "start with white/brown/pink noise and nature sounds."
Instrumentals, a mood per style and art that reacts to sound come later.

### What you hear

Ten ambient sounds, one at a time. Five are made live in code with Web Audio; they are random as
they go, so they never loop. The other five are 30-second seamless loops from files (see
"Sound files" below).

| Sound | How it's made |
|---|---|
| White noise | Even random samples, the same energy at every pitch |
| Pink noise | White noise through Paul Kellet's published pink filter, 3 dB softer each octave up |
| Brown noise | White noise through a leaky integrator, 6 dB softer each octave up: a deep rumble |
| Ocean | Deep noise through a low-pass filter whose opening and level swell and fall on an irregular 8 to 14 second cycle, drifting a little left and right |
| Wind | Noise through a band-pass filter whose centre and level wander on slow random curves |
| Rain | Steady gentle rain on leaves and soft ground |
| Stream | A small stream over rocks |
| Thunderstorm | Heavy rain with distant rolling thunder, no sharp cracks |
| Bonfire | A steady fire: soft crackle and a low roar, pops limited |
| Night | Sparse distant crickets over quiet grass |

No birds: synthesized birds sound fake. Stereo places in the made sounds stay within half-way
left and right (hard pans are unpleasant on headphones). Rain, stream and night crickets were
first made in code, but the owner found all three fake (2026-11-10), so they come from files
instead, along with thunderstorm and bonfire, which the owner asked for the same day. Thunder and
fire pops were ruled out at first as sudden sounds; the files keep them under the same startle
limits as everything else (below).

### Sound files (2026-11-10)

The owner chose generated takes over CC0 recordings: ElevenLabs Sound Effects on the owner's paid
plan, made in its seamless-loop mode, two takes each, picked by the owner by ear. Twelve takes
(including a first night take the owner rejected) cost 1,200 credits.

- `tools/sound-files.mjs` (needs ffmpeg, not shipped) makes each file from the picked take: laid
  end to end three times so the filters and limiter treat it as an endless loop, resampled to
  48 kHz, high-passed at 30 Hz, levelled to −20 LUFS and limited at −8 dBFS (2 ms look-ahead),
  then the middle copy is kept. It writes what it measured, per file, to
  `tools/sound-files.json`.
- Each file is 30.5 seconds, MP3 at 128 kb/s (about 0.5 MB): the 30-second loop starts
  0.25 seconds in, and its first 0.5 seconds are repeated after it. The app loops from 0.25
  to 30.25 seconds, so the loop is whole, with a quarter second to spare at both ends, whether
  or not a browser trims the MP3's encoder padding (a few milliseconds). A file that decodes
  shorter than that isn't played.
- The app fetches a file when it is picked, decodes it and plays it on a looping buffer source
  into the same gain node, so fades, volume and the Sound button work as before. Only the last
  decoded file is kept (each is about 11 MB decoded). A counter makes a slow load that has been
  overtaken by a later pick or Off do nothing, so two loops can never play at once.
- The service worker caches the five files at install (about 2.4 MB) in their own cache, named
  by their hash, so app updates don't download them again; one that fails to download is
  fetched when first played. If it is first picked offline and wasn't saved, sound turns off.
- Measured as played (two loops): all five at −20 LUFS ±0.3, peaks −7.0 dBFS or lower, 400 ms
  loudness at most +5.1 LU, 50 ms at most +6.2 LU. To get there the limiter cuts the loudest
  transients by up to about 20 dB (bonfire pops), 15 dB (rain drops) and 10 dB (stream), and
  barely touches thunderstorm and night; the owner listens to the levelled files before merge.
- **License:** the files are not under the repo's MIT license. ElevenLabs' sound-effects terms
  let a paid plan use output commercially inside an app, but not hand it out as separate audio
  files, samples or a sound library. `audio/LICENSE.md` says so; no attribution is required.
- **Fable red team (2026-11-10):** taken: a counter so overtaken loads never start a second
  loop (two at once would be +6 dB with no clamp); a stale failure no longer stops the current
  sound; Off then another sound mid-fade now starts the new one; one decoded file kept, not all
  five (about 58 MB); sound files in their own service-worker cache; a quarter second to spare
  at the loop's end; stale text fixed. Raised for the owner: a public repo makes the files
  downloadable on their own, which the terms arguably forbid (the owner's call, in the PR).
  Not taken: re-measuring in CI with ffmpeg (the hash check catches a changed file).

### Controls

- A **Sound** button on the bar (pressed while sound plays) opens the Sound panel, a modal
  dialog like About: native radio buttons for Off and the ten sounds, a volume slider, and
  Close. Picking a sound plays it. Arrow keys and Escape work inside it as usual (the art's
  arrow and Space keys are ignored in dialogs).
- **M** turns sound on and off (the last sound picked), also with the panel open.
- Only the Sound panel and M start sound: taps on the art, swipes and other buttons never do.
  The audio context is made and resumed inside that tap or key, before any wait, because Safari
  forgets the tap across one. Reopening Vibes is silent; the last sound and volume are
  remembered on this device.
- The Sound button shows what the browser is actually doing (the audio context's state), not the
  saved choice, so after a phone call or a lock it shows off when the browser has stopped it.
- Sound has its own on and off: it keeps playing while the art is paused, in Calm and with
  reduced motion, and when the page is hidden where the browser allows it (desktops do; locked
  phones usually stop it). When the page comes back, Vibes tries to resume; if it can't, one tap
  on M or the panel brings it back.
- iPhone: where Safari supports it (`navigator.audioSession`), sound plays as media, so the
  silent switch doesn't mute it once you've picked a sound.
- Pressing Update reloads the page, so sound stops until you tap again.

### Loudness and hearing (kid-safe)

Vibes can't know how loud a device or headphones play, so the rules cover what it sends out,
measured on the stereo output at full volume (BS.1770 K-weighted, gated):

- **Gentle and even:** each sound is levelled to −20 LUFS, or lower where that keeps its peaks
  under −6 dBFS (brown noise and ocean end up 2 to 4 LU lower). That is about 6 dB
  under typical streamed music, so at the same device volume Vibes plays quieter than music.
  Equal LUFS isn't equal loudness to every ear: brown noise sounds quieter on phone speakers.
- **Default volume 50%** (−12 dB). The slider is in perceptual steps (gain is the slider value
  squared), and the top of the slider is the levelled sound, never more.
- **No peaks:** sample peaks under −6 dBFS in the test. The audio thread clamps every generated
  sample at −6 dBFS whatever happens; sound files have no clamp when they play, so they are
  limited at −8 dBFS when they are made and measured after encoding. No compressor (the browser's one adds gain).
- **No sudden sounds:** 400 ms loudness stays within 6 LU of the sound's average, and 50 ms
  loudness within 10 LU, so waves, gusts, thunder and fire pops can't startle.
- **Fades:** sound fades in over 2 seconds; switching fades out over half a second and back in;
  turning off fades out over half a second, then stops the generator or file and suspends the
  audio.
- **No rumble or hum:** a 30 Hz high-pass on every sound, no DC offset.
- The panel says "Keep it low, especially with headphones and for kids", and About adds "for a
  sleeping baby, keep the device across the room and quiet."
- A **sleep timer** is the one exposure control an app has; it is the first follow-up.

### Safety with the art

The sound never changes the art and the art never changes the sound, so every flash and pattern
rule above is untouched. Art that reacts to sound comes later, under the same limits.

### Files and offline

```
src/sounds.js   the sound list, the five generators (pure, seeded, 48 kHz), and the AudioWorklet processor that runs them
audio/*.mp3     the five sound files (not MIT: see audio/LICENSE.md)
src/sound.js    the Sound panel, the audio graph (worklet or file loop, then gain for volume and fades) and its settings
tools/loudness.mjs, tools/sound-levels.mjs, tools/sound-files.mjs   BS.1770 meter and the levelling tools (not shipped)
```

One file holds both the generators and the worklet, so the worklet needs no `import` (support
for imports inside worklets has been uneven) and Node tests the same code that plays. About
16 KB in all, cached by the service worker like every other file, so sound works offline. The
audio context runs at 48 kHz on every device, so the filters and levels are tuned for one rate.
Where AudioWorklet is missing, the Sound button is hidden.

### Privacy

Nothing leaves the device and there is no microphone. The five sound files come from the app's
own site and are cached like every other file. The last sound and volume
join the other settings in `localStorage`.

### Tests

`node --test`, for every sound over 30 seconds at two seeds:

1. Every sample a number; no DC offset; the same seed gives the same samples.
2. Loudness at most −20 LUFS (+1.5 LU measuring slack) and no more than 5 LU under; peaks under
   −6 dBFS; 400 ms loudness within 6 LU and 50 ms loudness within 10 LU of the average.
3. Noise colors, 250 Hz to 4 kHz: white 0, pink −3 and brown −6 dB an octave, ±1.
4. Volume: 0 is silent, the top is gain 1, the default −12 dB; the clamp is at −6 dBFS.
5. The existing PWA (new files cached) and no-network tests cover the new files; the
   no-network test allows only the player's own `audio/` files.
6. Sound files (`test/sound-files.test.mjs`): each file's hash matches its measurements in
   `tools/sound-files.json`, and those meet rule 2 (CI has no MP3 decoder, so
   `tools/sound-files.mjs` measures them when it makes them).

Checked in Playwright (Chromium, autoplay blocked) before the PR: no audio context exists until
the Sound panel is used (taps on the art and arrow keys don't make one), the panel works by
keyboard without moving the art, M turns sound off and on, and sound plays offline after a
reload. Left to the owner: a real iPhone and Android phone (silent switch, lock screen, a call),
and listening to the samples (done 2026-11-10).

### Open questions (defaults in brackets)

1. Rain, stream and night crickets: answered 2026-11-10, generated loops instead of CC0
   recordings, plus thunderstorm and bonfire (see "Sound files").
2. One sound at a time, or a mixer to layer them (ocean over brown noise)? [One at a time.]
3. A sleep timer that fades out after 15, 30 or 60 minutes? [Next PR, not this one.]
4. Must sound keep playing on a locked phone? [No: desktops keep it going, phones resume on
   return. Locked-phone playback needs routing through an audio element and a real-device
   test.]

### Fable red team (2026-11-10)

Found 12 issues in the draft. Taken:

- **Phones:** the silent switch would mute most iPhones, so sound plays as media where Safari
  allows; locked-phone playback is an open question, and real-phone checks are on the owner's
  list.
- **Keys:** the art's arrow and Space keys would have fought a custom panel, so the panel is a
  native dialog with radio buttons and a slider, and M is handled before the dialog check.
- **No compressor as a limiter** (the browser's adds gain): a hard clamp at −6 dBFS instead.
- **Loudness versus peaks:** "−20 LUFS or lower where peaks need it", measured on stereo,
  gated; equal LUFS isn't equal loudness.
- **One sample rate:** the context runs at 48 kHz, so filters and tests cover one rate.
- **Autoplay:** only the panel and M start sound, the context resumes before any wait, and the
  button follows the context's real state.
- **Startle test:** a 50 ms rule added to the 400 ms one; drop ticks capped (rain, since cut).
- **Sound quality:** stream and crickets were to ship only after the owner listened (the owner cut them, and rain); pans limited.
- **Hearing claims softened;** baby-sleep advice added; sleep timer named as the first
  follow-up.
- **Worklet imports:** one file, no import inside the worklet.
- Numbers for the slope test; noted that Update stops sound; Kellet credited.

Not taken: nothing.

## Not in v1

- 10-fold star tilings (they don't repeat on a simple grid) and Hilbert curves (a full-screen
  grid of parallel lines, the worst stripe case).
- More styles later, each with its own pattern check. Still out: rings, tunnels, spirals,
  starbursts, moiré lattices, and a bouncing-line style (too close to a well-known Windows
  screensaver).
- Kaleidoscope mirror and afterglow trails (more pattern risk and build-up; revisit with the scan).
- Our real project pieces (each repo's seed and color) and share links to a piece.
- A "watch this piece" link from cards on prignano.ai to the same piece in Vibes.
- A real Windows screensaver (`.scr`).

## Open questions

Answered 2026-11-09: own subdomain, named Vibes; v1 is just the website's line art; sound comes
in v2.

1. Listed only in Projects (default), or also on /games?

## Fable red team (2026-11-09)

Found 17 issues in the first draft. Changed:

- **Cut the wire tunnel:** rings flying at you are the stripe pattern the guidance warns about.
- **Rewrote the flash scan:** every frame via a fixed time step, not 30 fps sampling (which
  misses one-frame flashes), and a grid with WCAG's area rule instead of an unstated method.
- **Cut afterglow trails and harmonograph morphing:** additive build-up whites out and drops at
  each change; gliding between frequency ratios turns the figure into a bright blob.
- **Cut mirror, bouncing lines and the new curve style** for v1; renamed the curve style away
  from a toy trademark and added a words test. Bouncing lines sat too close to a well-known
  Windows screensaver's look.
- **Numbers for the stripe rule** (30 lines, 2.5% spacing, 4:1 contrast, under 0.5 Hz).
- **Keep screen on by default in full screen**, since Windows blanks the display otherwise, and
  said plainly that installed apps still need F for full screen.
- **Per-style grow-in**, since flow trails have no paths to trace.
- **Size-free parameters**, so the pure tests hold at any screen size.
- Deferred our real project pieces and share links; fixed the license wording; one build PR, not
  two.

Not taken: Fable recommended a route on prignano.ai instead of a new repo (one copy of the art
code, no port). The owner chose `vibes.prignano.ai`, and a separate repo matches the games and
leaves room for v2 sound. Kept the installable app too, since every sibling app has it and it is
a copied recipe.

## Fable red team, second pass (2026-11-09): the 18 styles and the shared library

Found 16 issues. All taken:

- **Still frames would have been blank:** cards and reduced motion show the settled piece, not
  frame zero of the grow-in.
- **Rotation was too fast for the stripe rule** at the screen corners: periodic styles now turn
  at most once every 5 minutes, written as a testable speed rule.
- **Dissolving one grid into another makes moiré:** periodic-to-periodic changes fade through
  the background.
- **The pick has to run in the list**, not inside each card, which can't see its neighbours.
- **Stripe limits tightened:** repeat 4% of the height, thin lines, and the spec says plainly how
  it stays clear of the broadcast stripe count.
- **Contrast at every hue:** colors in OKLCH, tested across the wheel.
- **Density cap made testable:** geometry is a pure step, rasterised in the Node test.
- **Rhomb and hyperbolic tilings** now follow the stripe rules too.
- **Limited:** rose offset from its hub, times tables slowed and thinned, star polygons in at
  most three rings turning one way, star tilings 8- and 12-fold only, Hilbert cut from fractal
  curves.
- **Plumbing:** the flash scan ships with the first library PR; the theme's exports, files, types
  and brand profile change with it; the site pins the same commit as Vibes; offline caching lists
  the theme's art files.
- **Names:** marked pattern names and the rhomb tiling's inventor's name stay out of shipped
  text; the words test covers them.
