// Run with: node --test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DISSOLVE_SECONDS, FADE_SECONDS, HUE_DEGREES_PER_SECOND, MIN_PIECE_SECONDS,
  hueRate, nextStyles, opacities, pieceSeconds, transition,
} from '../src/cycle.js';

const ids = ['a', 'b', 'c', 'd', 'e'];
const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test('a piece stays at least 20 seconds, whatever the settings', () => {
  assert.ok(MIN_PIECE_SECONDS >= 20);
  for (const calm of [false, true]) assert.ok(pieceSeconds({ calm }) >= MIN_PIECE_SECONDS);
  assert.equal(pieceSeconds({ calm: false }), 45);
  assert.equal(pieceSeconds({ calm: true }), 90);
});

test('hand-overs last at least 1.5 seconds, and two periodic styles fade through the background', () => {
  assert.ok(DISSOLVE_SECONDS >= 1.5 && FADE_SECONDS >= 1.5);
  assert.deepEqual(transition('a', 'b', ['b']), { kind: 'dissolve', seconds: DISSOLVE_SECONDS });
  const through = transition('a', 'b', ['a', 'b']);
  assert.equal(through.kind, 'through');
  // The two never show at once: one is fully gone before the other appears.
  for (let x = 0; x <= through.seconds; x += 0.05) {
    const [out, inn] = opacities(through, x);
    assert.ok(out === 0 || inn === 0, `both visible at ${x}`);
  }
  assert.deepEqual(opacities(through, through.seconds), [0, 1]);
  // A dissolve changes opacity no faster than 1 / DISSOLVE_SECONDS a second.
  const dissolve = transition('a', 'b', []);
  for (let x = 0; x < dissolve.seconds; x += 0.1) {
    const step = Math.abs(opacities(dissolve, x + 0.1)[1] - opacities(dissolve, x)[1]);
    assert.ok(step <= 0.1 / DISSOLVE_SECONDS + 1e-9);
  }
});

test('color drift is at most one turn every 3 minutes, and off with reduced motion', () => {
  assert.ok(HUE_DEGREES_PER_SECOND * 180 <= 360);
  assert.ok(hueRate({ calm: true }) < hueRate({ calm: false }));
  assert.equal(hueRate({ reduceMotion: true }), 0);
});

test('every style plays once before any repeats, never twice in a row', () => {
  const rand = seeded(7);
  let last = null;
  for (let round = 0; round < 200; round++) {
    const bag = nextStyles(rand, ids, last);
    assert.deepEqual([...bag].sort(), ids);
    assert.notEqual(bag[0], last);
    for (let i = 1; i < bag.length; i++) assert.notEqual(bag[i], bag[i - 1]);
    last = bag[bag.length - 1];
  }
});
