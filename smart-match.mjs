import { normalizeStem, stemOf } from './validator.mjs';

const STOP_WORDS = new Set([
  'cover','art','artwork','album','single','front','final','master','masters','mastered','mix','mixed','version','v1','v2','v3',
  'official','audio','image','img','jpg','jpeg','png','wav','flac','mp3','m4a','aiff','aif','wma','release','song','track'
]);

function filePath(fileLike = {}) {
  return String(fileLike._distroprepPath || fileLike.webkitRelativePath || fileLike.path || fileLike.name || '');
}

function cleanWords(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\b(?:cover|art|artwork|album[\s_-]*art|front[\s_-]*cover|master(?:ed)?|final|mix(?:ed)?|official|clean|explicit|radio[\s_-]*edit)\b/gi, ' ')
    .replace(/^\s*\d{1,4}[\s._-]+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(value = '') {
  return cleanWords(value).split(/\s+/).filter(Boolean).filter((token) => !STOP_WORDS.has(token));
}

function pathTokens(fileLike = {}) {
  const path = filePath(fileLike).replaceAll('\\', '/');
  const parts = path.split('/').filter(Boolean);
  const folders = parts.slice(Math.max(0, parts.length - 3), -1);
  return significantTokens(folders.join(' '));
}

function numericPrefix(value = '') {
  const match = stemOf(String(value)).match(/^\s*(\d{1,4})[\s._-]+/);
  return match ? Number(match[1]) : null;
}

function diceBigrams(a = '', b = '') {
  const x = cleanWords(a).replaceAll(' ', '');
  const y = cleanWords(b).replaceAll(' ', '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const counts = new Map();
  for (let i = 0; i < x.length - 1; i += 1) {
    const gram = x.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < y.length - 1; i += 1) {
    const gram = y.slice(i, i + 2);
    const count = counts.get(gram) || 0;
    if (count > 0) {
      hits += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * hits) / ((x.length - 1) + (y.length - 1));
}

function tokenScore(a = [], b = []) {
  if (!a.length || !b.length) return { score: 0, intersection: 0, containment: 0 };
  const A = new Set(a);
  const B = new Set(b);
  let intersection = 0;
  for (const token of A) if (B.has(token)) intersection += 1;
  const union = new Set([...A, ...B]).size;
  const jaccard = union ? intersection / union : 0;
  const containment = intersection / Math.max(1, Math.min(A.size, B.size));
  return { score: (jaccard * 0.45) + (containment * 0.55), intersection, containment };
}

export function fingerprint(fileLike = {}) {
  const name = String(fileLike.name || '');
  const stem = normalizeStem(name);
  const nameTokens = significantTokens(stem);
  const folderTokens = pathTokens(fileLike);
  return {
    stem,
    clean: cleanWords(stem),
    nameTokens,
    folderTokens,
    allTokens: [...new Set([...nameTokens, ...folderTokens])],
    trackNumber: numericPrefix(name),
  };
}

export function pairScore(audio, artwork) {
  const a = fingerprint(audio);
  const b = fingerprint(artwork);
  if ((!a.clean && !a.folderTokens.length) || (!b.clean && !b.folderTokens.length)) return { score: 0, reason: 'No usable title or folder metadata' };
  if (a.clean && b.clean && a.clean === b.clean) return { score: 1, reason: 'Exact song-title filename match' };

  const title = tokenScore(a.nameTokens, b.nameTokens);
  const all = tokenScore(a.allTokens, b.allTokens);
  const folder = tokenScore(a.folderTokens, b.folderTokens);
  const fuzzy = diceBigrams(a.clean, b.clean);
  const contains = a.clean.includes(b.clean) || b.clean.includes(a.clean) ? 1 : 0;
  const numberMatch = a.trackNumber !== null && a.trackNumber === b.trackNumber ? 1 : 0;

  let score = (title.score * 0.62) + (fuzzy * 0.18) + (all.score * 0.08) + (folder.score * 0.07) + (contains * 0.03) + (numberMatch * 0.02);
  if (title.containment === 1 && title.intersection > 0) score = Math.max(score, 0.91);
  if (contains && title.intersection > 0) score = Math.max(score, 0.86);
  if (folder.containment === 1 && a.folderTokens.length && b.folderTokens.length && (!a.nameTokens.length || !b.nameTokens.length || a.clean === 'master' || b.clean === 'cover')) score = Math.max(score, 0.78);
  if (title.intersection === 0 && folder.intersection === 0 && !(numberMatch && fuzzy >= 0.55)) score = Math.min(score, 0.49);

  score = Math.max(0, Math.min(1, score));
  const reason = title.containment === 1 && title.intersection > 0 ? 'Same song-title words'
    : contains && title.intersection > 0 ? 'Artwork filename contains the song title'
      : folder.containment === 1 && a.folderTokens.length ? 'Matching song/release folder'
        : title.intersection > 0 && fuzzy >= 0.6 ? 'Title words + strong filename similarity'
          : title.intersection > 0 ? 'Shared song-title metadata'
            : numberMatch && fuzzy >= 0.55 ? 'Track number + filename similarity'
              : 'Weak title similarity — review manually';
  return { score, reason };
}

export function confidenceForScore(score = 0) {
  if (score >= 0.97) return 'exact';
  if (score >= 0.88) return 'high';
  if (score >= 0.74) return 'medium';
  if (score >= 0.62) return 'review';
  return 'unmatched';
}

function candidateIndex(artFiles = []) {
  const exact = new Map();
  const tokenMap = new Map();
  const numberMap = new Map();
  const fingerprints = artFiles.map((file, index) => ({ file, index, fp: fingerprint(file) }));
  for (const item of fingerprints) {
    if (item.fp.clean) {
      if (!exact.has(item.fp.clean)) exact.set(item.fp.clean, []);
      exact.get(item.fp.clean).push(item.index);
    }
    for (const token of item.fp.allTokens) {
      if (!tokenMap.has(token)) tokenMap.set(token, new Set());
      tokenMap.get(token).add(item.index);
    }
    if (item.fp.trackNumber !== null) {
      if (!numberMap.has(item.fp.trackNumber)) numberMap.set(item.fp.trackNumber, new Set());
      numberMap.get(item.fp.trackNumber).add(item.index);
    }
  }
  return { exact, tokenMap, numberMap, fingerprints };
}

function candidateIds(audio, index, artCount) {
  const fp = fingerprint(audio);
  const ids = new Set(index.exact.get(fp.clean) || []);
  for (const token of fp.allTokens) {
    const bucket = index.tokenMap.get(token);
    if (bucket) for (const id of bucket) ids.add(id);
  }
  if (fp.trackNumber !== null) {
    const bucket = index.numberMap.get(fp.trackNumber);
    if (bucket) for (const id of bucket) ids.add(id);
  }
  if (!ids.size && artCount <= 150) for (let i = 0; i < artCount; i += 1) ids.add(i);
  return ids;
}

export function smartMatchBatch(audioFiles = [], artFiles = [], { threshold = 0.62, topCandidates = 5 } = {}) {
  if (!audioFiles.length) return [];
  if (audioFiles.length === 1 && artFiles.length === 1) {
    const pair = pairScore(audioFiles[0], artFiles[0]);
    const score = Math.max(pair.score, 0.75);
    return [{ audio: audioFiles[0], artwork: artFiles[0], score, confidence: confidenceForScore(score), reason: pair.reason, candidates: [{ artwork: artFiles[0], score, reason: pair.reason }], matched: true }];
  }

  const index = candidateIndex(artFiles);
  const proposals = [];
  const perAudio = audioFiles.map((audio, audioIndex) => {
    const scored = [];
    for (const artIndex of candidateIds(audio, index, artFiles.length)) {
      const artwork = artFiles[artIndex];
      const result = pairScore(audio, artwork);
      scored.push({ audioIndex, artIndex, artwork, score: result.score, reason: result.reason });
    }
    scored.sort((x, y) => y.score - x.score || x.artIndex - y.artIndex);
    const top = scored.slice(0, topCandidates);
    for (const item of top) if (item.score >= threshold) proposals.push(item);
    return { audio, audioIndex, top };
  });

  proposals.sort((a, b) => b.score - a.score || a.audioIndex - b.audioIndex || a.artIndex - b.artIndex);
  const usedAudio = new Set();
  const usedArt = new Set();
  const assignments = new Map();
  for (const proposal of proposals) {
    if (usedAudio.has(proposal.audioIndex) || usedArt.has(proposal.artIndex)) continue;
    assignments.set(proposal.audioIndex, proposal);
    usedAudio.add(proposal.audioIndex);
    usedArt.add(proposal.artIndex);
  }

  return perAudio.map(({ audio, audioIndex, top }) => {
    const assigned = assignments.get(audioIndex) || null;
    const score = assigned?.score || top[0]?.score || 0;
    return {
      audio,
      artwork: assigned?.artwork || null,
      score,
      confidence: assigned ? confidenceForScore(score) : 'unmatched',
      reason: assigned?.reason || (top[0] ? `Best title match ${Math.round(top[0].score * 100)}% — review manually` : 'No artwork filename shares enough song-title metadata'),
      candidates: top.map(({ artwork, score: candidateScore, reason }) => ({ artwork, score: candidateScore, reason })),
      matched: Boolean(assigned),
    };
  });
}
