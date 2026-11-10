// Run with: node --test
// The sounds' loudness and hearing rules (docs/SPEC.md, "v2: sound"), measured on
// the generators' stereo output at full volume, 48 kHz.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLAMP, DEFAULT_VOLUME, SAMPLE_RATE, SOUNDS, gainFor } from '../src/sounds.js';
import { loudness } from '../tools/loudness.mjs';
import { PEAK_DBFS, TARGET_LUFS, peakDb, render } from '../tools/sound-levels.mjs';

const SECONDS = 30;

for (const { id } of SOUNDS) {
  test(`${id}: about -20 LUFS, no peaks over -6 dBFS, nothing sudden`, () => {
    for (const seed of [7, 8]) {
      const channels = render(id, { seconds: SECONDS, seed });
      for (const c of channels) {
        assert.ok(c.every(Number.isFinite), 'every sample is a number');
        assert.ok(Math.abs(c.reduce((s, x) => s + x, 0) / c.length) < 1e-3, 'no DC offset');
      }
      const { integrated, momentary, shortMax } = loudness(channels, SAMPLE_RATE);
      // At most the target (plus measuring slack); lower only where peaks need it.
      assert.ok(integrated <= TARGET_LUFS + 1.5 && integrated >= TARGET_LUFS - 5, `${integrated.toFixed(1)} LUFS`);
      assert.ok(peakDb(channels) < PEAK_DBFS, `peak ${peakDb(channels).toFixed(1)} dBFS`);
      assert.ok(Math.max(...momentary) <= integrated + 6, '400 ms loudness stays within 6 LU of the average');
      assert.ok(shortMax <= integrated + 10, '50 ms loudness stays within 10 LU of the average');
    }
  });
}

test('the same seed gives the same sound', () => {
  for (const { id } of SOUNDS) {
    const [a] = render(id, { seconds: 1, seed: 3 });
    const [b] = render(id, { seconds: 1, seed: 3 });
    assert.deepEqual(a, b, id);
  }
});

// Power in octave bands from 250 Hz to 4 kHz, as a slope in dB per octave of the
// spectrum (octave bands widen, adding 3 dB an octave, which is taken off).
function slope(id) {
  const [left] = render(id, { seconds: 10, seed: 5 });
  const bands = [250, 500, 1000, 2000, 4000].map((f) => {
    const w = (2 * Math.PI * f) / SAMPLE_RATE;
    const alpha = Math.sin(w) / (2 * Math.SQRT2);
    const [b0, a1, a2] = [alpha / (1 + alpha), (-2 * Math.cos(w)) / (1 + alpha), (1 - alpha) / (1 + alpha)];
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, sum = 0;
    for (const x of left) {
      const y = b0 * x - b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      sum += y * y;
    }
    return 10 * Math.log10(sum);
  });
  return (bands[4] - bands[0]) / 4 - 3;
}

test('noise colors: white is flat, pink falls 3 dB and brown 6 dB an octave', () => {
  for (const [id, want] of [['white', 0], ['pink', -3], ['brown', -6]]) {
    const got = slope(id);
    assert.ok(Math.abs(got - want) <= 1, `${id}: ${got.toFixed(2)} dB an octave`);
  }
});

test('volume: 0 is silent, the top is full level, the default is half (-12 dB)', () => {
  assert.equal(gainFor(0), 0);
  assert.equal(gainFor(1), 1);
  assert.equal(gainFor(2), 1);
  assert.equal(DEFAULT_VOLUME, 0.5);
  assert.ok(Math.abs(20 * Math.log10(gainFor(DEFAULT_VOLUME)) + 12) < 0.1);
  assert.ok(CLAMP <= 10 ** (PEAK_DBFS / 20) + 1e-9, 'the audio thread clamps at -6 dBFS');
});
