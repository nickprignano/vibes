# Vibes

Our line art, playing forever, like an old-school screensaver. Each piece grows in, drifts for a
while, then dissolves into the next, with a new random seed every time. Live at
[vibes.prignano.ai](https://vibes.prignano.ai).

The art comes from the line-art library in
[prignano-theme](https://github.com/nickprignano/prignano-theme) (`art/`), the same one that
draws the project cards on prignano.ai: 18 styles, from flow trails and harmonographs to star
tilings, hyperbolic tilings and fractal curves.

- **Controls:** left and right arrows (or a swipe) for previous and next, Space to pause, F or a
  double-click for full screen, C for Calm, M for sound. The bar and cursor hide after 3 seconds.
- **Sound:** white, pink and brown noise, ocean and wind, all generated live in
  code (no recordings), silent until you pick one, levelled to the same gentle
  loudness with no sudden noises. `node tools/sound-levels.mjs --wav DIR` writes samples to
  listen to.
- **Easy on the eyes:** nothing flashes; striped and tiled patterns stay faint, wide and slow, and
  two of them never overlap during a hand-over. Every style is checked frame by frame by the
  theme's flash scan. Calm halves the speed and fades the lines; with reduced motion on, Vibes
  shows still pieces you step through.
- **Spare screen:** install it as an app, press F, and Keep screen on (on by default in full
  screen) stops the display from sleeping.
- **Private:** nothing leaves the device. Settings stay in the browser.

Plain JavaScript and canvas, no build step, served as static files from Cloudflare. The plan is
in [docs/SPEC.md](docs/SPEC.md); hosting is in [docs/DEPLOY.md](docs/DEPLOY.md).

## Checks

```bash
node tools/sw-version.mjs   # after changing a served file or the theme pin
node --test
```

## License

MIT. See [LICENSE](LICENSE).
