// Vibes: plays the shared line art full screen, forever. Two stacked canvases
// let one piece hand over to the next.
import { createPiece, STYLES } from "https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/index.js";
import { headerHtml } from "https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/index.js";
import { hueRate, nextStyles, opacities, pieceSeconds, transition } from "./cycle.js";
import { load, save } from "./settings.js";

const PERIODIC = STYLES.filter((s) => s.pattern === "periodic").map((s) => s.id);
const IDS = STYLES.map((s) => s.id);
const MAX_PIXELS = 4_000_000;

const layers = [document.getElementById("a"), document.getElementById("b")];
const bar = document.getElementById("bar");
const label = document.getElementById("label");
const buttons = Object.fromEntries([...document.querySelectorAll("[data-do]")].map((b) => [b.dataset.do, b]));
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const settings = load({ calm: false, awake: true, noteSeen: false });
const state = {
  history: [], // pieces shown so far: { style, seed }
  at: -1, // index in history of the piece on screen
  bag: [],
  front: 0, // which layer is on top
  piece: null,
  incoming: null, // { piece, plan, x } while handing over
  age: 0, // seconds the current piece has played
  hue: 0,
  paused: false,
  reduceMotion: motionQuery.matches,
};
let counter = 0;
const random = Math.random;

// Backing store: up to 2x the pixel ratio and about 4 million pixels.
function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = window.innerWidth * dpr;
  let h = window.innerHeight * dpr;
  const over = Math.sqrt((w * h) / MAX_PIXELS);
  if (over > 1) {
    w /= over;
    h /= over;
  }
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
}

function make(canvas, { style, seed }, grow) {
  fit(canvas);
  const piece = createPiece(canvas, { seed, style, mode: "full", grow: grow && !state.reduceMotion, calm: settings.calm });
  piece.setHueShift(state.hue);
  piece.step(0);
  return piece;
}

function newEntry() {
  const last = state.history[state.history.length - 1]?.style ?? null;
  if (!state.bag.length) state.bag = nextStyles(random, IDS, last);
  return { style: state.bag.shift(), seed: `vibes-${Date.now()}-${counter++}` };
}

function showLabel() {
  const entry = state.history[state.at];
  label.textContent = STYLES.find((s) => s.id === entry.style)?.name ?? "";
}

// Moves to another piece: dissolving, fading through the background, or (with
// reduced motion) swapping at once.
function go(entry) {
  const back = layers[1 - state.front];
  const from = state.history[state.at]?.style;
  if (!state.piece || state.reduceMotion) {
    state.piece = make(layers[state.front], entry, true);
    layers[state.front].style.opacity = 1;
    back.style.opacity = 0;
    state.incoming = null;
  } else {
    // A hand-over already running finishes at once before the next one starts.
    if (state.incoming) finish();
    const piece = make(layers[1 - state.front], entry, true);
    state.incoming = { piece, plan: transition(from, entry.style, PERIODIC), x: 0 };
  }
  state.age = 0;
  showLabel();
}

function finish() {
  state.piece = state.incoming.piece;
  state.front = 1 - state.front;
  layers[state.front].style.opacity = 1;
  layers[1 - state.front].style.opacity = 0;
  layers[state.front].style.zIndex = 1;
  layers[1 - state.front].style.zIndex = 0;
  state.incoming = null;
}

function next() {
  if (state.at === state.history.length - 1) state.history.push(newEntry());
  state.at++;
  go(state.history[state.at]);
}

function previous() {
  if (state.at <= 0) return;
  state.at--;
  go(state.history[state.at]);
}

// Rebuilds the piece on screen at its settled frame (after a resize or a Calm
// change), keeping the same style and seed.
function rebuild() {
  if (state.incoming) finish();
  state.piece = make(layers[state.front], state.history[state.at], false);
}

let last = 0;
let frame = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
  last = now;
  if (!state.paused) {
    state.age += dt;
    state.hue = (state.hue + dt * hueRate({ calm: settings.calm, reduceMotion: false })) % 360;
    state.piece.setHueShift(state.hue);
    state.piece.step(dt);
    if (state.incoming) {
      const inc = state.incoming;
      inc.x += dt;
      inc.piece.setHueShift(state.hue);
      inc.piece.step(dt);
      // A dissolve fades the top piece out over the new one; a fade-through
      // fades the old piece out, then the new one in.
      const [out, inn] = opacities(inc.plan, inc.x);
      layers[state.front].style.opacity = out;
      layers[1 - state.front].style.opacity = inc.plan.kind === "dissolve" ? 1 : inn;
      if (inc.x >= inc.plan.seconds) finish();
    } else if (state.age >= pieceSeconds(settings)) next();
  }
  frame = requestAnimationFrame(tick);
}

function start() {
  stop();
  if (state.reduceMotion || document.hidden) return;
  last = 0;
  frame = requestAnimationFrame(tick);
}

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
}

// Reduced motion: still frames, no cycle; previous and next swap at once.
function applyMotion() {
  state.reduceMotion = motionQuery.matches;
  document.documentElement.classList.toggle("still", state.reduceMotion);
  buttons.pause.hidden = state.reduceMotion;
  rebuild();
  start();
}

function setPaused(paused) {
  state.paused = paused;
  buttons.pause.setAttribute("aria-pressed", String(paused));
  buttons.pause.textContent = paused ? "Play" : "Pause";
}

function setCalm(calm) {
  settings.calm = calm;
  save(settings);
  buttons.calm.setAttribute("aria-pressed", String(calm));
  // Hand over to a calm (or lively) copy of the same piece, so nothing jumps.
  if (state.piece) go(state.history[state.at]);
}

// Keep screen on: on by default while full screen; asked for again whenever the
// page comes back, since browsers drop the lock when it's hidden.
let lock = null;
async function updateWakeLock() {
  const want = settings.awake && document.fullscreenElement && !document.hidden;
  buttons.awake.setAttribute("aria-pressed", String(settings.awake));
  try {
    if (want && !lock) {
      lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => (lock = null));
    } else if (!want && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Some browsers (iPhone Safari) have no full screen for pages.
  }
}

// The bar and cursor hide after 3 seconds without input.
let idle = 0;
function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (!bar.contains(document.activeElement) || document.activeElement === document.body) document.body.classList.add("idle");
  }, 3000);
}

const actions = {
  previous,
  next,
  pause: () => setPaused(!state.paused),
  calm: () => setCalm(!settings.calm),
  awake: () => {
    settings.awake = !settings.awake;
    save(settings);
    updateWakeLock();
  },
  fullscreen: toggleFullscreen,
  about: () => document.getElementById("about").showModal(),
};
for (const [name, button] of Object.entries(buttons)) button.addEventListener("click", () => actions[name]?.());

document.addEventListener("keydown", (e) => {
  wake();
  if (e.target.closest?.("dialog") || e.altKey || e.ctrlKey || e.metaKey) return;
  const key = { ArrowLeft: "previous", ArrowRight: "next", " ": "pause", f: "fullscreen", F: "fullscreen", c: "calm", C: "calm" }[e.key];
  if (!key || (key === "pause" && state.reduceMotion)) return;
  if (key === "pause" && e.target.closest?.("button")) return; // Space on a button presses the button
  e.preventDefault();
  actions[key]();
});

// Swipes on the art: left for next, right for previous.
let swipe = null;
const art = document.getElementById("art");
art.addEventListener("pointerdown", (e) => (swipe = { x: e.clientX, y: e.clientY }));
art.addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - swipe.y)) (dx < 0 ? next : previous)();
  swipe = null;
});
art.addEventListener("dblclick", toggleFullscreen);
for (const type of ["pointermove", "pointerdown", "touchstart"]) document.addEventListener(type, wake, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
  else start();
  updateWakeLock();
});
document.addEventListener("fullscreenchange", () => {
  buttons.fullscreen.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
  updateWakeLock();
});
motionQuery.addEventListener("change", applyMotion);
let resizing = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizing);
  resizing = setTimeout(rebuild, 200);
});

// First open: one line about moving patterns, once per device.
const note = document.getElementById("note");
if (!settings.noteSeen) {
  note.hidden = false;
  document.getElementById("note-ok").addEventListener("click", () => {
    note.hidden = true;
    settings.noteSeen = true;
    save(settings);
  });
  document.getElementById("note-calm").addEventListener("click", () => {
    note.hidden = true;
    settings.noteSeen = true;
    setCalm(true);
  });
}

if (!("wakeLock" in navigator)) buttons.awake.hidden = true;
if (!document.fullscreenEnabled) buttons.fullscreen.hidden = true;
document.getElementById("about-header").innerHTML = headerHtml({ bio: "Our line art, forever." });
buttons.calm.setAttribute("aria-pressed", String(settings.calm));
setPaused(false);
document.documentElement.classList.toggle("still", state.reduceMotion);
buttons.pause.hidden = state.reduceMotion;
next();
start();
wake();

// Installed app: keep a copy for offline use, and offer an update when there is one.
if ("serviceWorker" in navigator) {
  // Reload only after Update is pressed, not when the first install claims the page.
  let reloadOnUpdate = false;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const offer = () => {
      if (!reg.waiting) return;
      buttons.update.hidden = false;
      actions.update = () => {
        reloadOnUpdate = true;
        reg.waiting?.postMessage("skip-waiting");
      };
    };
    offer();
    reg.addEventListener("updatefound", () => reg.installing?.addEventListener("statechange", offer));
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => reloadOnUpdate && location.reload());
}
