// The ambient sounds, made in code: a seed in, stereo samples at 48 kHz out.
// One file for both sides: the page imports SOUNDS and gainFor, the audio thread
// loads it as an AudioWorklet (the processor at the bottom), and Node tests the
// generators, so loudness and noise color are checked without a browser.

export const SOUNDS = [
  { id: "white", name: "White noise" },
  { id: "pink", name: "Pink noise" },
  { id: "brown", name: "Brown noise" },
  { id: "ocean", name: "Ocean" },
  { id: "wind", name: "Wind" },
];

export const SAMPLE_RATE = 48000;

// Level of each sound so that every one measures -20 LUFS at full volume, or
// less where that keeps peaks under -6 dBFS (set with `node tools/sound-levels.mjs`;
// test/sounds.test.mjs checks them).
export const LEVELS = { white: 0.08536, pink: 0.04202, brown: 0.01601, ocean: 0.0646, wind: 0.2074 };

// Seeded random numbers in [0, 1).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pink noise: white noise through Paul Kellet's published pink filter.
function pinkNoise(rand) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = rand() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out;
  };
}

// Brown noise: white noise through a leaky integrator (corner near 5 Hz).
function brownNoise(rand, rate) {
  const leak = Math.exp((-2 * Math.PI * 5) / rate);
  let y = 0;
  return () => (y = leak * y + (rand() * 2 - 1));
}

// A two-pole filter (RBJ cookbook), with settable shape.
function biquad() {
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return {
    set(type, freq, q, rate) {
      const w = (2 * Math.PI * Math.min(freq, rate * 0.45)) / rate;
      const cos = Math.cos(w);
      const alpha = Math.sin(w) / (2 * q);
      const a0 = 1 + alpha;
      if (type === "lowpass") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      else if (type === "highpass") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      else [b0, b1, b2] = [alpha, 0, -alpha]; // band-pass, 0 dB peak
      b0 /= a0;
      b1 /= a0;
      b2 /= a0;
      a1 = (-2 * cos) / a0;
      a2 = (1 - alpha) / a0;
      return this;
    },
    run(x) {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
  };
}

// A value that wanders between lo and hi, gliding to a new random target every
// `seconds` or so. Stepped once per block.
function wander(rand, lo, hi, seconds, rate, block) {
  let value = lo + rand() * (hi - lo);
  let target = value;
  let left = 0;
  const glide = 1 - Math.exp(-block / (rate * seconds * 0.5));
  return () => {
    left -= block;
    if (left <= 0) {
      target = lo + rand() * (hi - lo);
      left = rate * seconds * (0.5 + rand());
    }
    value += glide * (target - value);
    return value;
  };
}

// Each maker returns (left, right) => fills one block of samples. Coefficients
// change once per block, so blocks are short (the worklet uses 128).
const MAKERS = {
  white(rand) {
    return (left, right) => {
      for (let i = 0; i < left.length; i++) {
        left[i] = rand() * 2 - 1;
        right[i] = rand() * 2 - 1;
      }
    };
  },

  pink(rand) {
    const l = pinkNoise(rand), r = pinkNoise(rand);
    return (left, right) => {
      for (let i = 0; i < left.length; i++) {
        left[i] = l();
        right[i] = r();
      }
    };
  },

  brown(rand, rate) {
    const l = brownNoise(rand, rate), r = brownNoise(rand, rate);
    return (left, right) => {
      for (let i = 0; i < left.length; i++) {
        left[i] = l();
        right[i] = r();
      }
    };
  },

  // Deep noise through a low-pass that opens and closes with each wave.
  ocean(rand, rate) {
    const noise = [brownNoise(rand, rate), brownNoise(rand, rate)];
    const pink = [pinkNoise(rand), pinkNoise(rand)];
    const filters = [biquad(), biquad()];
    let t = 0, period = 1, pan = 0.5, nextPan = 0.5;
    const newWave = () => {
      t = 0;
      period = (8 + rand() * 6) * rate;
      pan = nextPan;
      nextPan = 0.3 + rand() * 0.4;
    };
    newWave();
    return (left, right) => {
      t += left.length;
      if (t >= period) newWave();
      const x = t / period;
      // Rises over the first 35% (the wave breaking), then washes out slowly.
      const swell = x < 0.35 ? Math.sin((x / 0.35) * (Math.PI / 2)) ** 2 : Math.exp(-((x - 0.35) / 0.65) * 2.2);
      const gain = 0.5 + 0.5 * swell;
      const p = pan + (nextPan - pan) * x;
      for (const f of filters) f.set("lowpass", 250 + swell * 2200, 0.6, rate);
      const gl = gain * Math.cos((p * Math.PI) / 2) * Math.SQRT2;
      const gr = gain * Math.sin((p * Math.PI) / 2) * Math.SQRT2;
      for (let i = 0; i < left.length; i++) {
        left[i] = filters[0].run(noise[0]() * 0.05 + pink[0]()) * gl;
        right[i] = filters[1].run(noise[1]() * 0.05 + pink[1]()) * gr;
      }
    };
  },

  // Noise through band-passes whose centre and level wander slowly.
  wind(rand, rate) {
    const n = 128;
    const noise = [pinkNoise(rand), pinkNoise(rand)];
    const filters = [biquad(), biquad()];
    const centre = [wander(rand, 250, 900, 3, rate, n), wander(rand, 250, 900, 3, rate, n)];
    const level = [wander(rand, 0.45, 1, 4, rate, n), wander(rand, 0.45, 1, 4, rate, n)];
    return (left, right) => {
      const outs = [left, right];
      for (let c = 0; c < 2; c++) {
        filters[c].set("bandpass", centre[c](), 2.2, rate);
        const g = level[c]();
        const o = outs[c];
        for (let i = 0; i < o.length; i++) o[i] = filters[c].run(noise[c]()) * g;
      }
    };
  },
};

// A running sound: render(left, right) fills both arrays with the next samples,
// at full volume, with a 30 Hz high-pass so there's no rumble or DC.
export function createSound(id, { seed, sampleRate = SAMPLE_RATE }) {
  const fill = MAKERS[id](rng(seed), sampleRate);
  const level = LEVELS[id];
  const hp = [biquad().set("highpass", 30, 0.7, sampleRate), biquad().set("highpass", 30, 0.7, sampleRate)];
  return {
    render(left, right) {
      fill(left, right);
      for (let i = 0; i < left.length; i++) {
        left[i] = hp[0].run(left[i]) * level;
        right[i] = hp[1].run(right[i]) * level;
      }
    },
  };
}

// Volume slider (0 to 1) to gain: perceptual steps, full volume is gain 1.
export const DEFAULT_VOLUME = 0.5;
export const gainFor = (volume) => Math.min(1, Math.max(0, volume)) ** 2;

// Never more than this out of the generator, whatever happens (-6 dBFS).
export const CLAMP = 0.5;

// On the audio thread: plays one sound, switched by a message from the page.
// The page's gain node does volume and fades.
if (typeof registerProcessor === "function") {
  registerProcessor(
    "vibes-sound",
    class extends AudioWorkletProcessor {
      constructor() {
        super();
        this.sound = null;
        this.port.onmessage = ({ data }) => (this.sound = data ? createSound(data.id, { seed: data.seed, sampleRate }) : null);
      }
      process(_, [out]) {
        if (this.sound && out.length >= 2) {
          this.sound.render(out[0], out[1]);
          for (const channel of out) for (let i = 0; i < channel.length; i++) channel[i] = Math.max(-CLAMP, Math.min(CLAMP, channel[i]));
        }
        return true;
      }
    },
  );
}
