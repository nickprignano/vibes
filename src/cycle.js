// The cycle's rules: which style plays next, how long a piece stays, and how
// one piece hands over to the next. Pure, so the safety rules are tested in Node.

export const PIECE_SECONDS = 45;
export const CALM_PIECE_SECONDS = 90;
// Whatever the settings, the cycle never changes pieces on its own faster than this.
export const MIN_PIECE_SECONDS = 20;
export const DISSOLVE_SECONDS = 3;
// Between two periodic (striped or tiled) styles: fade out, then in, so two
// grids never overlap (the moire case).
export const FADE_SECONDS = 1.5;
// Color drift: at most one full turn of the hue wheel every 3 minutes.
export const HUE_DEGREES_PER_SECOND = 2;

export const pieceSeconds = ({ calm }) => Math.max(MIN_PIECE_SECONDS, calm ? CALM_PIECE_SECONDS : PIECE_SECONDS);
export const hueRate = ({ calm, reduceMotion }) => (reduceMotion ? 0 : calm ? HUE_DEGREES_PER_SECOND / 2 : HUE_DEGREES_PER_SECOND);

// A shuffled order of every style, played once each before reshuffling, never
// the same style twice in a row (also across reshuffles).
export function nextStyles(rand, ids, last = null) {
  const bag = [...ids];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  if (bag.length > 1 && bag[0] === last) [bag[0], bag[1]] = [bag[1], bag[0]];
  return bag;
}

// How one piece hands over to the next.
export function transition(from, to, periodic) {
  if (periodic.includes(from) && periodic.includes(to)) return { kind: "through", seconds: 2 * FADE_SECONDS };
  return { kind: "dissolve", seconds: DISSOLVE_SECONDS };
}

// Opacity of the outgoing and incoming piece, x seconds into a transition.
export function opacities({ kind }, x) {
  if (kind === "through") {
    const out = Math.max(0, 1 - x / FADE_SECONDS);
    const inn = Math.min(1, Math.max(0, (x - FADE_SECONDS) / FADE_SECONDS));
    return [out, inn];
  }
  const mix = Math.min(1, Math.max(0, x / DISSOLVE_SECONDS));
  return [1 - mix, mix];
}
