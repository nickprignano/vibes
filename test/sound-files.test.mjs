// Run with: node --test
// The sound files in audio/ (docs/SPEC.md, "v2: sound"). tools/sound-files.mjs makes them
// and measures each loop as the app plays it (CI has no MP3 decoder); this checks those
// measurements against the same rules as the generated sounds, and that they are for
// these exact files.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { LEAD, LOOP, SOUNDS } from '../src/sounds.js';
import { PEAK_DBFS, TARGET_LUFS } from '../tools/sound-levels.mjs';

const measured = JSON.parse(readFileSync('tools/sound-files.json', 'utf8'));
const FILES = SOUNDS.filter((s) => s.file);

for (const { id, file } of FILES) {
  test(`${id}: measured for this file, about -20 LUFS, no peaks over -6 dBFS, nothing sudden`, () => {
    const m = measured[id];
    assert.ok(m, `${id} has no measurements: run node tools/sound-files.mjs`);
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), m.sha256, `${file} changed since it was measured`);
    assert.ok(m.integrated <= TARGET_LUFS + 1.5 && m.integrated >= TARGET_LUFS - 5, `${m.integrated} LUFS`);
    assert.ok(m.peak < PEAK_DBFS, `peak ${m.peak} dBFS`);
    assert.ok(m.momentaryOver <= 6, '400 ms loudness stays within 6 LU of the average');
    assert.ok(m.shortOver <= 10, '50 ms loudness stays within 10 LU of the average');
    assert.ok(m.seconds >= 2 * LEAD + LOOP - 0.01, 'the file holds the whole loop, with room to spare');
    assert.ok(statSync(file).size < 600_000, 'about half a megabyte');
  });
}

test('every measured file is one the app plays', () => {
  assert.deepEqual(Object.keys(measured).sort(), FILES.map((s) => s.id).sort());
});
