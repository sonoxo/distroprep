export const DEFAULT_TEMPLATE = Object.freeze({
  services: 'All available services',
  previouslyReleased: false,
  originalReleaseDate: '',
  artistName: '',
  releaseDate: '',
  recordLabel: '',
  language: 'English',
  primaryGenre: '',
  secondaryGenre: '',
  albumPrice: '',
  artistMapping: { spotify: '', appleMusic: '', youtubeMusic: '' },
  performer: '',
  producer: '',
  songwriters: '',
  explicit: 'no',
  radioEdit: 'no',
  instrumental: 'no',
  appleDigitalMaster: 'no',
  previewStart: '',
  trackPrice: '',
});

export function normalizeTemplate(value = {}) {
  return {
    ...DEFAULT_TEMPLATE,
    ...value,
    previouslyReleased: Boolean(value.previouslyReleased),
    artistMapping: {
      ...DEFAULT_TEMPLATE.artistMapping,
      ...(value.artistMapping || {}),
    },
    performer: value.performer ?? value.appleCredits?.performer ?? '',
    producer: value.producer ?? value.appleCredits?.producer ?? '',
  };
}

export function templateFromLegacyDraft(draft = {}) {
  return normalizeTemplate({
    services: draft.services,
    previouslyReleased: draft.previouslyReleased,
    originalReleaseDate: draft.originalReleaseDate,
    artistName: draft.artistName,
    releaseDate: draft.releaseDate,
    recordLabel: draft.recordLabel,
    language: draft.language,
    primaryGenre: draft.primaryGenre,
    secondaryGenre: draft.secondaryGenre,
    albumPrice: draft.albumPrice,
    artistMapping: draft.artistMapping,
    performer: draft.appleCredits?.performer,
    producer: draft.appleCredits?.producer,
    songwriters: draft.songwriters,
  });
}

export function buildSingleManifest(template, item, index = 0) {
  const t = normalizeTemplate(template);
  const title = String(item.title || '').trim();
  return {
    schema: 'distroprep.personal.bulk1000.v1',
    createdAt: new Date().toISOString(),
    submissionMode: 'manual-final-submit',
    inheritedFromPreviousRelease: true,
    services: t.services,
    previouslyReleased: t.previouslyReleased,
    originalReleaseDate: t.originalReleaseDate,
    artistName: t.artistName,
    releaseDate: t.releaseDate,
    recordLabel: t.recordLabel,
    releaseTitle: title,
    language: t.language,
    primaryGenre: t.primaryGenre,
    secondaryGenre: t.secondaryGenre,
    albumPrice: t.albumPrice,
    artistMapping: t.artistMapping,
    appleCredits: { performer: t.performer, producer: t.producer },
    numberOfSongs: 1,
    artwork: item.artwork ? {
      fileName: item.artwork.name,
      relativePath: item.artwork._distroprepPath || item.artwork.webkitRelativePath || '',
      width: item.artWidth ?? null,
      height: item.artHeight ?? null,
      validation: item.artValidation ?? null,
      match: { score: item.score ?? 0, confidence: item.confidence || 'unmatched', reason: item.reason || '' },
    } : null,
    tracks: [{
      trackNumber: 1,
      batchIndex: index + 1,
      title,
      fileName: item.audio?.name || '',
      relativePath: item.audio?._distroprepPath || item.audio?.webkitRelativePath || '',
      fileSizeBytes: item.audio?.size || 0,
      audioValidation: item.audioValidation ?? null,
      songwriterType: 'original',
      songwriters: t.songwriters,
      explicit: t.explicit === 'yes',
      radioEdit: t.radioEdit === 'yes',
      instrumental: t.instrumental === 'yes',
      appleDigitalMaster: t.appleDigitalMaster === 'yes',
      previewStart: t.previewStart,
      trackPrice: t.trackPrice,
      producer: t.producer,
      performer: t.performer,
    }],
  };
}
