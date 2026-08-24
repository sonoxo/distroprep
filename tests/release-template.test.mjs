import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSingleManifest, templateFromLegacyDraft } from '../release-template.mjs';

test('legacy release draft becomes reusable batch template', () => {
  const template = templateFromLegacyDraft({
    artistName: 'Artist',
    recordLabel: 'Label',
    language: 'English',
    primaryGenre: 'Hip-Hop/Rap',
    artistMapping: { spotify: 'spotify:artist:test' },
    appleCredits: { producer: 'Producer', performer: 'Artist' },
  });
  assert.equal(template.artistName, 'Artist');
  assert.equal(template.producer, 'Producer');
  assert.equal(template.artistMapping.spotify, 'spotify:artist:test');
});

test('single manifest inherits template while title and artwork vary', () => {
  const template = {
    artistName: 'Artist',
    recordLabel: 'Same Label',
    language: 'English',
    primaryGenre: 'Hip-Hop/Rap',
    songwriters: 'Legal Name',
  };
  const first = buildSingleManifest(template, { title: 'Song A', audio: { name: 'Song A.wav', size: 1 }, artwork: { name: 'Song A.jpg' } });
  const second = buildSingleManifest(template, { title: 'Song B', audio: { name: 'Song B.wav', size: 1 }, artwork: { name: 'Song B.jpg' } });
  assert.equal(first.recordLabel, second.recordLabel);
  assert.notEqual(first.releaseTitle, second.releaseTitle);
  assert.notEqual(first.artwork.fileName, second.artwork.fileName);
});
