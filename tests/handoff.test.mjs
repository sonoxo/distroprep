import test from 'node:test';
import assert from 'node:assert/strict';
import { handoffReadiness, nextPendingIndex, releaseKey } from '../handoff.mjs';

test('release key changes when the song or artwork changes', () => {
  const a = releaseKey({ index: 0, title: 'Night Drive', audioFile: 'Night Drive.wav', artworkFile: 'Night Drive.jpg' });
  const b = releaseKey({ index: 0, title: 'Night Drive', audioFile: 'Night Drive.wav', artworkFile: 'Other.jpg' });
  assert.notEqual(a, b);
});

test('handoff readiness requires title, artist, master and matched valid art', () => {
  const ready = handoffReadiness({ title: 'Night Drive', artistName: 'Artist', audioFile: 'Night Drive.wav', artworkFile: 'Night Drive.jpg', audioValid: true, artworkValid: true });
  assert.equal(ready.ok, true);
  const bad = handoffReadiness({ title: '', artistName: '', audioFile: '', artworkFile: 'No artwork match', audioValid: false, artworkValid: false });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.length >= 5);
});

test('next pending release skips completed releases and wraps', () => {
  const releases = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  assert.equal(nextPendingIndex(releases, new Set(['b']), 0), 2);
  assert.equal(nextPendingIndex(releases, new Set(['b', 'c']), 1), 0);
  assert.equal(nextPendingIndex(releases, new Set(['a', 'b', 'c']), 0), -1);
});
