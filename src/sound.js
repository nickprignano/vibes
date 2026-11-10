// Ambient sound: the Sound panel and the audio graph (generator worklet, then a
// gain node for volume and fades). Nothing plays until the panel or M is used,
// since browsers only allow audio after a tap or key.
import { DEFAULT_VOLUME, SAMPLE_RATE, SOUNDS, gainFor } from "./sounds.js";

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

  function fade(gain, to, seconds) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  async function play(id) {
    clearTimeout(stopping);
    const switching = playing && id !== settings.sound;
    settings.sound = id;
    save(settings);
    playing = true;
    const { node, gain } = await open();
    // A new sound fades through quiet, so nothing starts abruptly.
    if (switching) {
      fade(gain, 0, FADE_OUT);
      await new Promise((done) => setTimeout(done, FADE_OUT * 1000));
      if (!playing || settings.sound !== id) return;
    }
    if (switching || gain.gain.value === 0) node.port.postMessage({ id, seed: Math.floor(Math.random() * 2 ** 32) });
    fade(gain, gainFor(settings.volume), FADE_IN);
    show();
  }

  async function stop() {
    playing = false;
    show();
    if (!ready) return;
    const { node, gain } = await ready;
    fade(gain, 0, FADE_OUT);
    // Once faded, stop the generator and let the device rest.
    stopping = setTimeout(() => {
      node.port.postMessage(null);
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
