// Measures each sound at full volume over three seeds and prints the LEVELS that put
// it at -20 LUFS, or lower where that keeps peaks under -6 dBFS with a margin;
// paste them into src/sounds.js. With --wav DIR, also writes a 20-second sample of
// each sound there, to listen to.
//   node tools/sound-levels.mjs [--wav DIR]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS, SAMPLE_RATE, SOUNDS, createSound } from '../src/sounds.js';
import { loudness } from './loudness.mjs';

export const TARGET_LUFS = -20;
export const PEAK_DBFS = -6;
export const SEEDS = [1, 2, 3];

// Renders `seconds` of a sound in 128-sample blocks, as the worklet does.
export function render(id, { seconds, seed }) {
  const sound = createSound(id, { seed });
  const n = Math.ceil((seconds * SAMPLE_RATE) / 128) * 128;
  const channels = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i += 128) sound.render(channels[0].subarray(i, i + 128), channels[1].subarray(i, i + 128));
  return channels;
}

function wav([left, right], rate) {
  const data = Buffer.alloc(left.length * 4);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 4, 28); head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

export const peakDb = (channels) => 20 * Math.log10(Math.max(...channels.map((c) => c.reduce((m, x) => Math.max(m, Math.abs(x)), 0))));

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] === '--wav' ? process.argv[3] : null;
  const rate = SAMPLE_RATE;
  const levels = {};
  for (const { id } of SOUNDS) {
    let quietest = Infinity, loudest = -Infinity, peak = -Infinity;
    for (const seed of SEEDS) {
      const channels = render(id, { seconds: 60, seed });
      const { integrated, momentary, shortMax } = loudness(channels, rate);
      quietest = Math.min(quietest, integrated);
      loudest = Math.max(loudest, integrated);
      peak = Math.max(peak, peakDb(channels));
      console.log(`${id} seed ${seed}: ${integrated.toFixed(2)} LUFS, 400 ms max +${(Math.max(...momentary) - integrated).toFixed(2)} LU, 50 ms max +${(shortMax - integrated).toFixed(2)} LU, peak ${peakDb(channels).toFixed(2)} dBFS`);
      if (dir && seed === SEEDS[0]) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${id}.wav`), wav(channels.map((c) => c.subarray(0, 20 * rate)), rate));
      }
    }
    const mid = (quietest + loudest) / 2;
    const db = Math.min(TARGET_LUFS - mid, PEAK_DBFS - 1 - peak);
    levels[id] = Number((LEVELS[id] * 10 ** (db / 20)).toPrecision(4));
  }
  console.log('LEVELS =', JSON.stringify(levels));
}
