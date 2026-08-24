import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStem,
  validateAudioFile,
  validateArtworkDimensions,
  matchAudioToArtwork,
  releaseHealth,
} from '../validator.mjs';

test('normalizes filenames for artwork matching', () => {
  assert.equal(normalizeStem('01 - Midnight Ride.wav'), 'midnight ride');
  assert.equal(normalizeStem('Midnight_Ride-cover.jpg'), 'midnight ride');
});

test('rejects unsupported audio and oversize audio', () => {
  const result = validateAudioFile({ name: 'song.ogg', size: 2 * 1024 * 1024 * 1024 });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
});

test('validates recommended artwork dimensions', () => {
  assert.equal(validateArtworkDimensions(3000, 3000).ok, true);
  assert.equal(validateArtworkDimensions(900, 900).ok, false);
});

test('matches audio and cover by normalized stem', () => {
  const audio = [{ name: '01 My Song.wav' }];
  const art = [{ name: 'My Song Artwork.jpg' }];
  assert.equal(matchAudioToArtwork(audio, art)[0].matched, true);
});

test('release health catches missing required metadata', () => {
  const status = releaseHealth({ artistName: '', releaseTitle: '', language: '', primaryGenre: '', tracks: [], artworkStatus: { ok: false } });
  assert.equal(status.ok, false);
  assert.ok(status.errors.length >= 5);
});
