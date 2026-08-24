export const AUDIO_EXTENSIONS = new Set(['wav', 'mp3', 'm4a', 'flac', 'aiff', 'aif', 'wma']);
export const ART_EXTENSIONS = new Set(['jpg', 'jpeg']);
export const MAX_AUDIO_BYTES = 1024 * 1024 * 1024;
export const INVALID_AUDIO_FILENAME_CHARS = /[\\/:*?"'<>|]/;

export function extensionOf(name = '') {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function stemOf(name = '') {
  const dot = name.lastIndexOf('.');
  return (dot === -1 ? name : name.slice(0, dot)).trim();
}

export function normalizeStem(name = '') {
  return stemOf(name)
    .toLowerCase()
    .replace(/(?:[-_ ](?:cover|art|artwork|album[-_ ]?art))$/i, '')
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function titleFromFilename(name = '') {
  return stemOf(name)
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function validateAudioFile(fileLike) {
  const errors = [];
  const warnings = [];
  const ext = extensionOf(fileLike?.name || '');
  if (!AUDIO_EXTENSIONS.has(ext)) {
    errors.push(`Unsupported audio format .${ext || '?'}. Use WAV, MP3, M4A, FLAC, AIFF, or WMA.`);
  }
  if ((fileLike?.size || 0) > MAX_AUDIO_BYTES) {
    errors.push('Audio file exceeds DistroKid\'s 1 GB per-track limit.');
  }
  if (INVALID_AUDIO_FILENAME_CHARS.test(fileLike?.name || '')) {
    errors.push('Filename contains a character DistroKid does not accept: \\ / : * ? " \' < > |');
  }
  if (['mp3', 'm4a', 'wma'].includes(ext)) {
    warnings.push('Lossy source detected. WAV or FLAC is recommended when a lossless master is available.');
  }
  return { ok: errors.length === 0, errors, warnings, ext };
}

export function validateArtworkFile(fileLike) {
  const errors = [];
  const warnings = [];
  const ext = extensionOf(fileLike?.name || '');
  if (!ART_EXTENSIONS.has(ext)) {
    errors.push('Artwork must be a JPG/JPEG file for DistroKid delivery.');
  }
  warnings.push('Confirm the final artwork is saved in RGB color mode before submission.');
  return { ok: errors.length === 0, errors, warnings, ext };
}

export function validateArtworkDimensions(width, height) {
  const errors = [];
  const warnings = [];
  if (!width || !height) {
    errors.push('Artwork dimensions could not be read.');
  } else {
    if (width < 1000 || height < 1000) errors.push('Artwork must be at least 1000×1000 pixels.');
    if (width !== height) warnings.push('Artwork should be square. DistroKid may resize rectangular artwork.');
    if (width !== 3000 || height !== 3000) warnings.push('3000×3000 JPG is the recommended target.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function matchAudioToArtwork(audioFiles = [], artFiles = []) {
  const artByStem = new Map();
  for (const art of artFiles) {
    const key = normalizeStem(art.name);
    if (!artByStem.has(key)) artByStem.set(key, []);
    artByStem.get(key).push(art);
  }

  return audioFiles.map((audio) => {
    const key = normalizeStem(audio.name);
    const exact = artByStem.get(key) || [];
    const artwork = exact.length === 1 ? exact[0] : (audioFiles.length === 1 && artFiles.length === 1 ? artFiles[0] : null);
    return { audio, artwork, matched: Boolean(artwork), key };
  });
}

export function releaseHealth({ artistName, releaseTitle, language, primaryGenre, tracks = [], artworkStatus }) {
  const errors = [];
  if (!String(artistName || '').trim()) errors.push('Artist/band name is required.');
  if (tracks.length > 1 && !String(releaseTitle || '').trim()) errors.push('Album/EP title is required for multi-track releases.');
  if (!String(language || '').trim()) errors.push('Release language is required.');
  if (!String(primaryGenre || '').trim()) errors.push('Primary genre is required.');
  if (!tracks.length) errors.push('Add at least one audio track.');
  if (!artworkStatus?.ok) errors.push('Add artwork that passes the minimum artwork checks.');
  for (const [index, track] of tracks.entries()) {
    if (!String(track.title || '').trim()) errors.push(`Track ${index + 1} needs a song title.`);
    if (!track.audioValidation?.ok) errors.push(`Track ${index + 1} has an invalid audio file.`);
    if (!String(track.songwriters || '').trim()) errors.push(`Track ${index + 1} needs songwriter/composer real name(s).`);
    if (track.songwriterType === 'cover' && !String(track.originalArtist || '').trim()) errors.push(`Track ${index + 1} cover needs the original artist.`);
    if (track.songwriterType === 'cover' && !String(track.originalTitle || '').trim()) errors.push(`Track ${index + 1} cover needs the original song title.`);
  }
  return { ok: errors.length === 0, errors };
}
