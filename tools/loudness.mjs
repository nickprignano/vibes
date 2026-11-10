// Loudness of stereo samples, after ITU-R BS.1770 (K-weighting, 400 ms blocks,
// gated): used by the sound tests and tools/sound-levels.mjs. Not shipped.

// The two K-weighting filters at any sample rate (the standard's analog
// prototypes, as derived for libebur128).
function kWeighting(rate) {
  let K = Math.tan((Math.PI * 1681.974450955533) / rate);
  const Q1 = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q1 + K * K;
  const shelf = {
    b: [(Vh + (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q1 + K * K) / a0],
    a: [(2 * (K * K - 1)) / a0, (1 - K / Q1 + K * K) / a0],
  };
  K = Math.tan((Math.PI * 38.13547087602444) / rate);
  const Q2 = 0.5003270373238773;
  a0 = 1 + K / Q2 + K * K;
  const highpass = { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q2 + K * K) / a0] };
  return [shelf, highpass];
}

function filter(samples, { b, a }) {
  const out = new Float64Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

const lufs = (power) => -0.691 + 10 * Math.log10(power);

// The gated integrated loudness, the loudness of each 400 ms block (momentary,
// 75% overlap), and the loudest 50 ms window (to catch startling ticks).
export function loudness(channels, rate) {
  const weighted = channels.map((c) => kWeighting(rate).reduce(filter, c));
  const blocks = power(weighted, Math.round(0.4 * rate), Math.round(0.1 * rate));
  const loud = blocks.filter((p) => lufs(p) > -70);
  const mean = (list) => list.reduce((s, p) => s + p, 0) / list.length;
  const gate = lufs(mean(loud)) - 10;
  const short = power(weighted, Math.round(0.05 * rate), Math.round(0.025 * rate));
  return {
    integrated: lufs(mean(loud.filter((p) => lufs(p) > gate))),
    momentary: blocks.map(lufs),
    shortMax: lufs(Math.max(...short)),
  };
}

// Mean power summed over channels, per window.
function power(weighted, size, hop) {
  const blocks = [];
  for (let start = 0; start + size <= weighted[0].length; start += hop) {
    let power = 0;
    for (const c of weighted) {
      let sum = 0;
      for (let i = start; i < start + size; i++) sum += c[i] * c[i];
      power += sum / size;
    }
    blocks.push(power);
  }
  return blocks;
}
