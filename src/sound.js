// Ambient sound: the Sound panel and the audio graph (generator worklet, or a looping
// sound file, then a gain node for volume and fades). Nothing plays until the panel or M is used,
// since browsers only allow audio after a tap or key.
import { DEFAULT_VOLUME, LEAD, LOOP, SAMPLE_RATE, SOUNDS, gainFor } from "./sounds.js";

const FADE_IN = 2;
const FADE_OUT = 0.5;

export function setupSound({ button, dialog, settings, save }) {
  settings.sound ??= "brown";
  settings.volume ??= DEFAULT_VOLUME;
  if (!window.AudioWorkletNode) {
    button.hidden = true;
    return { toggle() {} };
  }

  const list = dialog.querySelector("#sound-list");
  list.insertAdjacentHTML(
    "beforeend",
    [{ id: "off", name: "Off" }, ...SOUNDS].map(({ id, name }) => `<label><input type="radio" name="sound" value="${id}"> ${name}</label>`).join(""),
  );
  const volume = dialog.querySelector("#volume");
  volume.value = Math.round(settings.volume * 100);

  let ctx = null;
  let ready = null; // resolves to { node, gain } once the worklet has loaded
  let playing = false; // wanted on; the browser may still have suspended it
  let stopping = 0;
  let turn = 0; // counts plays and stops, so a slow load can tell it has been overtaken
  let feeding = null; // the id of the sound feeding the gain node, if any
  let source = null; // the looping sound file now playing, if any
  let loaded = null; // { id, buffer }: the last sound file, kept while it may play again

  const running = () => playing && ctx?.state === "running";
  function show() {
    button.setAttribute("aria-pressed", String(running()));
    const want = running() ? settings.sound : "off";
    for (const input of list.querySelectorAll("input")) input.checked = input.value === want;
  }

  // Called from a tap or key. The context is made and resumed before any await,
  // because Safari forgets the tap across one.
  function open() {
    if (!ctx) {
      // iPhone: play like a media app (through the silent switch), where supported.
      if (navigator.audioSession) navigator.audioSession.type = "playback";
      ctx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: "playback" });
      ctx.addEventListener("statechange", show);
      ready = ctx.audioWorklet.addModule("src/sounds.js").then(() => {
        const node = new AudioWorkletNode(ctx, "vibes-sound", { numberOfInputs: 0, outputChannelCount: [2] });
        const gain = ctx.createGain();
        gain.gain.value = 0;
        node.connect(gain).connect(ctx.destination);
        return { node, gain };
      });
    }
    ctx.resume().catch(() => {});
    return ready;
  }

  function silence(node) {
    node.port.postMessage(null);
    source?.stop();
    source = null;
    feeding = null;
  }

  // Switches what feeds the gain node to this sound: the generator, or a sound file's
  // loop (fetched and decoded the first time; only one is kept, to spare memory).
  async function start(id, node, gain, mine) {
    silence(node);
    const { file } = SOUNDS.find((s) => s.id === id);
    if (!file) {
      node.port.postMessage({ id, seed: Math.floor(Math.random() * 2 ** 32) });
      feeding = id;
      return;
    }
    if (loaded?.id !== id) {
      const load = fetch(file)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))))
        .then((data) => ctx.decodeAudioData(data));
      loaded = { id, buffer: load };
      load.catch(() => loaded?.buffer === load && (loaded = null)); // offline before it was saved: try again next time
    }
    const buffer = await loaded.buffer;
    if (buffer.duration < LEAD + LOOP) throw new Error(`${file} is short`);
    if (mine !== turn) return;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = LEAD;
    source.loopEnd = LEAD + LOOP;
    source.connect(gain);
    source.start(0, LEAD);
    feeding = id;
  }

  function fade(gain, to, seconds) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  async function play(id) {
    clearTimeout(stopping);
    settings.sound = id;
    save(settings);
    playing = true;
    const mine = ++turn;
    const { node, gain } = await open();
    if (mine !== turn) return;
    if (feeding !== id) {
      // A new sound fades through quiet, so nothing starts abruptly.
      if (feeding && gain.gain.value > 0) {
        fade(gain, 0, FADE_OUT);
        await new Promise((done) => setTimeout(done, FADE_OUT * 1000));
        if (mine !== turn) return;
      }
      try {
        await start(id, node, gain, mine);
      } catch {
        if (mine === turn) stop();
        return;
      }
      if (mine !== turn) return;
    }
    fade(gain, gainFor(settings.volume), FADE_IN);
    show();
  }

  async function stop() {
    playing = false;
    turn++;
    show();
    if (!ready) return;
    const { node, gain } = await ready;
    fade(gain, 0, FADE_OUT);
    // Once faded, stop the generator or file and let the device rest.
    stopping = setTimeout(() => {
      silence(node);
      ctx.suspend();
    }, FADE_OUT * 1000 + 100);
  }

  list.addEventListener("change", (e) => (e.target.value === "off" ? stop() : play(e.target.value)));
  volume.addEventListener("input", async () => {
    settings.volume = volume.value / 100;
    save(settings);
    if (!playing || !ready) return;
    const { gain } = await ready;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(gainFor(settings.volume), ctx.currentTime, 0.05);
  });
  // Phones suspend audio when locked or on a call; try to pick it up again on return.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && playing && ctx?.state !== "running") ctx.resume().catch(() => {}).finally(show);
  });
  show();

  return {
    open: () => {
      show();
      dialog.showModal();
    },
    toggle: () => (running() ? stop() : play(settings.sound)),
  };
}
