// Makes the recorded-style sounds in audio/ from the generated takes the owner picked
// (ElevenLabs Sound Effects, 30-second seamless loops), and writes what it measured to
// tools/sound-files.json, which test/sound-files.test.mjs checks. Needs ffmpeg; not shipped.
//   node tools/sound-files.mjs SOURCE_DIR   (SOURCE_DIR has rain.mp3, stream.mp3, ...)
//
// Each take is decoded, laid end to end three times so filters and the limiter see it as
// the endless loop it is, resampled to 48 kHz, high-passed at 30 Hz, levelled to -20 LUFS
// (lower where the startle rules need it) and limited to -8 dBFS (MP3 coding adds up to a
// decibel). The middle copy is kept, with its first 2 * LEAD seconds added again at the
// end, so the loop plays from LEAD to LEAD + LOOP, with LEAD to spare at both ends, whether
// or not a browser trims the MP3's encoder padding.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEAD, LOOP, SAMPLE_RATE, SOUNDS } from '../src/sounds.js';
import { loudness } from './loudness.mjs';
import { PEAK_DBFS, TARGET_LUFS, peakDb } from './sound-levels.mjs';

const LIMIT_DBFS = PEAK_DBFS - 2;
const LOWEST_LUFS = TARGET_LUFS - 4;

const ffmpeg = (args, input) => execFileSync('ffmpeg', ['-v', 'error', ...args], { input, maxBuffer: 1 << 30 });
const raw = (args) => `-f f32le -ac 2 -ar ${args}`.split(' ');

// Interleaved stereo float32 to [left, right] and back.
function split(buf) {
  const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const l = new Float32Array(x.length / 2), r = new Float32Array(x.length / 2);
  for (let i = 0; i < l.length; i++) [l[i], r[i]] = [x[2 * i], x[2 * i + 1]];
  return [l, r];
}
function join2([l, r]) {
  const x = new Float32Array(l.length * 2);
  for (let i = 0; i < l.length; i++) [x[2 * i], x[2 * i + 1]] = [l[i], r[i]];
  return Buffer.from(x.buffer);
}
const tile = (c, times) => {
  const out = new Float32Array(c.length * times);
  for (let k = 0; k < times; k++) out.set(c, k * c.length);
  return out;
};

// Measures one loop, played twice, as the app plays it from the encoded file.
function measure(file) {
  const [l, r] = split(ffmpeg(['-i', file, ...raw(SAMPLE_RATE), '-']));
  const start = Math.round(LEAD * SAMPLE_RATE), n = LOOP * SAMPLE_RATE;
  const loop = [l, r].map((c) => tile(c.subarray(start, start + n), 2));
  const { integrated, momentary, shortMax } = loudness(loop, SAMPLE_RATE);
  return {
    integrated: +integrated.toFixed(2),
    momentaryOver: +(Math.max(...momentary) - integrated).toFixed(2),
    shortOver: +(shortMax - integrated).toFixed(2),
    peak: +peakDb(loop).toFixed(2),
    seconds: +(l.length / SAMPLE_RATE).toFixed(3),
  };
}

function make(id, src, out, rise) {
  // Decode at the take's own rate (exactly LOOP seconds), lay it end to end three times.
  const [l, r] = split(ffmpeg(['-i', src, '-f', 'f32le', '-ac', '2', '-']));
  const srcRate = l.length / LOOP;
  if (!Number.isInteger(srcRate)) throw new Error(`${id}: not exactly ${LOOP} s (${l.length} samples)`);
  const three = join2([tile(l, 3), tile(r, 3)]);
  const filters = `aresample=${SAMPLE_RATE}:filter_size=64,highpass=f=30:p=2,volume=${rise.toFixed(2)}dB,` +
    `alimiter=limit=${10 ** (LIMIT_DBFS / 20)}:attack=2:release=60:level=disabled`;
  const [L, R] = split(ffmpeg(['-f', 'f32le', '-ac', '2', '-ar', String(srcRate), '-i', 'pipe:', '-af', filters, ...raw(SAMPLE_RATE), '-'], three));
  const n = LOOP * SAMPLE_RATE, lead = Math.round(LEAD * SAMPLE_RATE);
  const keep = [L, R].map((c) => {
    const o = new Float32Array(n + 2 * lead);
    o.set(c.subarray(n, 2 * n));
    o.set(c.subarray(n, n + 2 * lead), n);
    return o;
  });
  ffmpeg(['-y', '-f', 'f32le', '-ac', '2', '-ar', String(SAMPLE_RATE), '-i', 'pipe:', '-c:a', 'libmp3lame', '-b:a', '128k', out], join2(keep));
  return measure(out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  const record = {};
  for (const { id, file } of SOUNDS.filter((s) => s.file)) {
    const src = join(dir, `${id}.mp3`);
    const out = file;
    // Level to the target, re-measure once (the limiter takes a little off), and step
    // down a decibel at a time until the startle rules hold.
    const start = make(id, src, out, 0).integrated;
    let m;
    for (let want = TARGET_LUFS; want >= LOWEST_LUFS; want--) {
      let rise = want - start;
      rise += want - make(id, src, out, rise).integrated;
      m = make(id, src, out, rise);
      if (m.momentaryOver <= 6 && m.shortOver <= 10 && m.peak < PEAK_DBFS) break;
    }
    record[id] = {
      source: createHash('sha256').update(readFileSync(src)).digest('hex'),
      sha256: createHash('sha256').update(readFileSync(out)).digest('hex'),
      ...m,
    };
    console.log(id, JSON.stringify(record[id]));
  }
  writeFileSync('tools/sound-files.json', JSON.stringify(record, null, 2) + '\n');
}
