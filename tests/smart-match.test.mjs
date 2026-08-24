import test from 'node:test';
import assert from 'node:assert/strict';
import { pairScore, smartMatchBatch } from '../smart-match.mjs';

const f = (name, path = '') => ({ name, size: 12, webkitRelativePath: path });

test('exact normalized title matches cover suffix', () => {
  const result = pairScore(f('01 Neon Rain.wav'), f('Neon Rain Cover.jpg'));
  assert.equal(result.score, 1);
});

test('smart matcher handles punctuation and artwork words', () => {
  const rows = smartMatchBatch(
    [f('Cold_Summer FINAL.wav'), f('Money Talk (Master).flac')],
    [f('money-talk artwork.jpg'), f('Cold Summer cover.jpg')],
  );
  assert.equal(rows[0].artwork.name, 'Cold Summer cover.jpg');
  assert.equal(rows[1].artwork.name, 'money-talk artwork.jpg');
  assert.ok(rows.every((row) => row.matched));
});

test('matching stays one artwork per audio file', () => {
  const art = f('Blue Moon.jpg');
  const rows = smartMatchBatch([f('Blue Moon.wav'), f('Blue Moon Remix.wav')], [art]);
  assert.equal(rows.filter((row) => row.artwork === art).length, 1);
});

test('folder identity can match generic master and cover filenames', () => {
  const rows = smartMatchBatch(
    [
      f('master.wav', 'Masters/Night Drive/master.wav'),
      f('master.wav', 'Masters/Cold Summer/master.wav'),
    ],
    [
      f('cover.jpg', 'Artwork/Cold Summer/cover.jpg'),
      f('cover.jpg', 'Artwork/Night Drive/cover.jpg'),
    ],
  );
  assert.equal(rows[0].matched, true);
  assert.equal(rows[0].artwork.webkitRelativePath, 'Artwork/Night Drive/cover.jpg');
  assert.equal(rows[1].artwork.webkitRelativePath, 'Artwork/Cold Summer/cover.jpg');
});

test('1000-item batch resolves exact normalized pairs', () => {
  const audio = Array.from({ length: 1000 }, (_, i) => f(`${String(i + 1).padStart(4, '0')} - Song ${i + 1}.wav`));
  const art = Array.from({ length: 1000 }, (_, i) => f(`Song ${i + 1} Cover.jpg`));
  const rows = smartMatchBatch(audio, art);
  assert.equal(rows.length, 1000);
  assert.equal(rows.filter((row) => row.matched).length, 1000);
});
