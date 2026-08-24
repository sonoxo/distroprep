import {
  ART_EXTENSIONS,
  AUDIO_EXTENSIONS,
  extensionOf,
  titleFromFilename,
  validateArtworkDimensions,
  validateArtworkFile,
  validateAudioFile,
} from './validator.mjs';
import { pairScore, smartMatchBatch } from './smart-match.mjs';
import { buildSingleManifest, DEFAULT_TEMPLATE, normalizeTemplate, templateFromLegacyDraft } from './release-template.mjs';

const MAX_TRACKS = 1000;
const PAGE_SIZE = 100;
const TEMPLATE_KEY = 'distroprep-last-release-template';
const LEGACY_KEY = 'distroprep-draft';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  audio: [],
  art: [],
  rows: [],
  template: normalizeTemplate(DEFAULT_TEMPLATE),
  page: 0,
  filter: 'all',
  query: '',
  editIndex: null,
  artMeta: new Map(),
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function bytes(n = 0) { if (n < 1024) return `${n} B`; if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`; if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`; return `${(n / 1024 ** 3).toFixed(2)} GB`; }
function filePath(file = {}) { return String(file.webkitRelativePath || file.name || ''); }
function fileKey(file = {}) { return `${filePath(file)}::${file.size || 0}::${file.lastModified || 0}`; }
function uniqueFiles(files = []) { const seen = new Set(); return files.filter((file) => { const key = fileKey(file); if (seen.has(key)) return false; seen.add(key); return true; }); }
function deriveTitle(name = '') { return titleFromFilename(name).replace(/\s*[-_(]*(?:final|master(?:ed)?|mix(?:ed)?|radio edit|clean|explicit)[)_-]*\s*$/i, '').trim(); }
function download(name, content, type = 'application/json') { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([content], { type })); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1200); }
function csv(value) { const s = String(value ?? ''); return `"${s.replaceAll('"', '""')}"`; }
function toast(message) { const el = document.createElement('div'); el.textContent = message; Object.assign(el.style, { position: 'fixed', right: '18px', bottom: '18px', zIndex: 999, background: '#b8ff2c', color: '#090a0b', padding: '11px 14px', borderRadius: '10px', fontWeight: '900', boxShadow: '0 16px 40px rgba(0,0,0,.35)' }); document.body.append(el); setTimeout(() => el.remove(), 2000); }
function setProcessing(message) { $('#processing-status').textContent = message; }

function getNested(obj, path) { return path.split('.').reduce((value, key) => value?.[key], obj); }
function setNested(obj, path, value) { const keys = path.split('.'); let cursor = obj; while (keys.length > 1) { const key = keys.shift(); cursor[key] ||= {}; cursor = cursor[key]; } cursor[keys[0]] = value; }

function loadStoredTemplate() {
  let source = 'No previous release template found. Fill this once, then save it.';
  let template = null;
  try {
    const saved = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || 'null');
    if (saved) { template = normalizeTemplate(saved); source = 'Loaded your last DistroPrep batch/release template from this browser.'; }
  } catch {}
  if (!template) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy) { template = templateFromLegacyDraft(legacy); source = 'Inherited metadata from your previous Release Builder draft.'; }
    } catch {}
  }
  state.template = template || normalizeTemplate(DEFAULT_TEMPLATE);
  applyTemplateToForm();
  $('#template-source').textContent = source;
  $('#template-status').textContent = template ? 'Previous metadata loaded' : 'New template';
  $('#template-status').className = `status-chip ${template ? 'ok' : ''}`;
}

function applyTemplateToForm() {
  $$('[data-template]').forEach((input) => {
    const path = input.dataset.template;
    let value = getNested(state.template, path);
    if (path === 'previouslyReleased') value = String(Boolean(value));
    input.value = value ?? '';
  });
}

function readTemplateFromForm() {
  const next = normalizeTemplate(state.template);
  $$('[data-template]').forEach((input) => {
    const path = input.dataset.template;
    let value = input.value;
    if (path === 'previouslyReleased') value = value === 'true';
    setNested(next, path, value);
  });
  state.template = normalizeTemplate(next);
  return state.template;
}

function saveTemplate({ quiet = false } = {}) {
  const template = readTemplateFromForm();
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
  $('#template-source').textContent = 'Saved as the metadata template for your next release/batch in this browser.';
  $('#template-status').textContent = 'Previous metadata saved';
  $('#template-status').className = 'status-chip ok';
  if (!quiet) toast('Previous-release metadata saved');
}

function setAudioFiles(fileList) {
  const incoming = uniqueFiles([...fileList]).filter((file) => AUDIO_EXTENSIONS.has(extensionOf(file.name))).sort((a, b) => filePath(a).localeCompare(filePath(b), undefined, { numeric: true }));
  const skipped = Math.max(0, incoming.length - MAX_TRACKS);
  state.audio = incoming.slice(0, MAX_TRACKS);
  state.rows = [];
  $('#audio-message').textContent = `${state.audio.length} master${state.audio.length === 1 ? '' : 's'} loaded${skipped ? ` • ${skipped} skipped above the 1,000-song limit` : ''}.`;
  updateStats();
  autoMatchWhenReady();
}

function setArtFiles(fileList) {
  const incoming = uniqueFiles([...fileList]).filter((file) => ART_EXTENSIONS.has(extensionOf(file.name))).sort((a, b) => filePath(a).localeCompare(filePath(b), undefined, { numeric: true }));
  state.art = incoming.slice(0, MAX_TRACKS);
  state.artMeta.clear();
  state.rows = [];
  const ignored = [...fileList].length - incoming.length;
  $('#art-message').textContent = `${state.art.length} JPG/JPEG cover${state.art.length === 1 ? '' : 's'} loaded${ignored > 0 ? ` • ${ignored} non-JPG file${ignored === 1 ? '' : 's'} ignored` : ''}.`;
  updateStats();
  autoMatchWhenReady();
}

let autoMatchTimer = null;
function autoMatchWhenReady() {
  clearTimeout(autoMatchTimer);
  if (state.audio.length && state.art.length) autoMatchTimer = setTimeout(() => runSmartMatch(), 150);
  else renderQueue();
}

async function imageDimensions(file) {
  if (state.artMeta.has(fileKey(file))) return state.artMeta.get(fileKey(file));
  let result;
  try {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      result = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
    } else {
      result = await new Promise((resolve, reject) => {
        const image = new Image(); const url = URL.createObjectURL(file);
        image.onload = () => { const dims = { width: image.naturalWidth, height: image.naturalHeight }; URL.revokeObjectURL(url); resolve(dims); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image unreadable')); };
        image.src = url;
      });
    }
  } catch { result = { width: 0, height: 0 }; }
  state.artMeta.set(fileKey(file), result);
  return result;
}

async function mapLimit(items, limit, worker) {
  let cursor = 0;
  const output = new Array(items.length);
  async function run() { while (cursor < items.length) { const index = cursor++; output[index] = await worker(items[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return output;
}

async function validateArtworkForRow(row) {
  if (!row.artwork) { row.artValidation = { ok: false, errors: ['No matched artwork'], warnings: [] }; row.artWidth = null; row.artHeight = null; return; }
  const base = validateArtworkFile(row.artwork);
  const dims = await imageDimensions(row.artwork);
  const dim = validateArtworkDimensions(dims.width, dims.height);
  row.artWidth = dims.width;
  row.artHeight = dims.height;
  row.artValidation = { ok: base.ok && dim.ok, errors: [...base.errors, ...dim.errors], warnings: [...base.warnings, ...dim.warnings] };
}

async function runSmartMatch() {
  if (!state.audio.length) { toast('Load a masters folder first'); return; }
  setProcessing(`Matching ${state.audio.length} masters against ${state.art.length} covers…`);
  $('#smart-match').disabled = true;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const matches = smartMatchBatch(state.audio, state.art);
  state.rows = matches.map((match) => ({
    ...match,
    title: deriveTitle(match.audio.name),
    audioValidation: validateAudioFile(match.audio),
    artValidation: match.artwork ? { ok: true, errors: [], warnings: ['Checking dimensions…'] } : { ok: false, errors: ['No matched artwork'], warnings: [] },
    artWidth: null,
    artHeight: null,
  }));
  state.page = 0;
  renderQueue();
  updateStats();

  const matchedRows = state.rows.filter((row) => row.artwork);
  let checked = 0;
  await mapLimit(matchedRows, 8, async (row) => {
    await validateArtworkForRow(row);
    checked += 1;
    if (checked % 25 === 0 || checked === matchedRows.length) setProcessing(`Artwork checks ${checked}/${matchedRows.length}…`);
  });
  setProcessing(`Smart match complete • ${state.rows.filter((r) => r.matched).length}/${state.rows.length} paired.`);
  $('#smart-match').disabled = false;
  renderQueue();
  updateStats();
}

function rowNeedsReview(row) {
  return !row.matched || !row.audioValidation?.ok || !row.artValidation?.ok || ['review', 'unmatched'].includes(row.confidence);
}

function updateStats() {
  const matched = state.rows.filter((row) => row.matched).length;
  const review = state.rows.filter(rowNeedsReview).length;
  $('#stat-audio').textContent = state.audio.length;
  $('#stat-art').textContent = state.art.length;
  $('#stat-matched').textContent = matched;
  $('#stat-match-rate').textContent = state.audio.length ? `${Math.round((matched / state.audio.length) * 100)}%` : '0%';
  $('#stat-review').textContent = review;
}

function filteredRows() {
  const q = state.query.toLowerCase().trim();
  return state.rows.map((row, index) => ({ row, index })).filter(({ row }) => {
    const filterOk = state.filter === 'all'
      || (state.filter === 'matched' && row.matched && !rowNeedsReview(row))
      || (state.filter === 'review' && rowNeedsReview(row))
      || (state.filter === 'unmatched' && !row.matched);
    if (!filterOk) return false;
    if (!q) return true;
    return `${row.title} ${row.audio?.name || ''} ${row.artwork?.name || ''}`.toLowerCase().includes(q);
  });
}

function checkMarkup(row) {
  const audioOk = row.audioValidation?.ok;
  const artOk = row.artValidation?.ok;
  if (audioOk && artOk) return '<span class="check-badge ok">✓ files ready</span>';
  const issue = !audioOk ? 'audio issue' : !row.artwork ? 'art missing' : 'art issue';
  return `<span class="check-badge ${row.artValidation?.warnings?.includes('Checking dimensions…') ? 'warn' : 'bad'}">${escapeHtml(issue)}</span>`;
}

function renderQueue() {
  const body = $('#queue-body');
  const filtered = filteredRows();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages - 1);
  const start = state.page * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  $('#queue-count').textContent = `${filtered.length} release${filtered.length === 1 ? '' : 's'}`;
  $('#page-label').textContent = `Page ${state.page + 1} of ${pages}`;
  $('#page-prev').disabled = state.page <= 0;
  $('#page-next').disabled = state.page >= pages - 1;

  if (!visible.length) {
    body.innerHTML = `<tr><td colspan="7" class="queue-empty">${state.rows.length ? 'No releases match this filter.' : 'Load master and artwork folders to build the queue.'}</td></tr>`;
    return;
  }

  body.innerHTML = visible.map(({ row, index }) => {
    const score = Math.round((row.score || 0) * 100);
    const art = row.artwork ? `<div class="file-stack"><strong title="${escapeHtml(filePath(row.artwork))}">${escapeHtml(row.artwork.name)}</strong><small>${row.artWidth ? `${row.artWidth}×${row.artHeight}` : 'dimensions pending'}</small></div>` : '<div class="file-stack"><strong>⚠ No artwork match</strong><small>Use Change art</small></div>';
    const audioErrors = row.audioValidation?.errors?.join(' • ') || '';
    const artErrors = row.artValidation?.errors?.join(' • ') || '';
    return `<tr data-row="${index}">
      <td><strong>${index + 1}</strong></td>
      <td><input class="title-edit" data-title="${index}" value="${escapeHtml(row.title)}" aria-label="Song title ${index + 1}"></td>
      <td><div class="file-stack"><strong title="${escapeHtml(filePath(row.audio))}">${escapeHtml(row.audio.name)}</strong><small>${bytes(row.audio.size)}${audioErrors ? ` • ${escapeHtml(audioErrors)}` : ''}</small></div></td>
      <td>${art}<button class="text-button" data-art="${index}">Change art</button></td>
      <td><span class="match-badge ${escapeHtml(row.confidence)}">${score}% ${escapeHtml(row.confidence)}</span><div class="confidence-meter" title="${escapeHtml(row.reason)}"><i style="--score:${score}%"></i></div><small class="muted">${escapeHtml(row.reason)}</small></td>
      <td title="${escapeHtml([audioErrors, artErrors].filter(Boolean).join(' • '))}">${checkMarkup(row)}</td>
      <td><div class="row-actions"><button data-copy="${index}">Copy JSON</button><a href="https://distrokid.com/new/" target="_blank" rel="noopener noreferrer">DK ↗</a></div></td>
    </tr>`;
  }).join('');

  $$('[data-title]', body).forEach((input) => input.addEventListener('input', () => { state.rows[Number(input.dataset.title)].title = input.value; }));
  $$('[data-art]', body).forEach((button) => button.addEventListener('click', () => openArtworkDialog(Number(button.dataset.art))));
  $$('[data-copy]', body).forEach((button) => button.addEventListener('click', async () => {
    const index = Number(button.dataset.copy);
    const manifest = buildSingleManifest(readTemplateFromForm(), state.rows[index], index);
    await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    toast('Single manifest copied');
  }));
}

function openArtworkDialog(index) {
  state.editIndex = index;
  const row = state.rows[index];
  $('#art-dialog-song').textContent = `Artwork for “${row.title}”`;
  $('#art-dialog-search').value = '';
  renderArtworkOptions();
  $('#art-dialog').showModal();
  setTimeout(() => $('#art-dialog-search').focus(), 50);
}

function renderArtworkOptions() {
  const row = state.rows[state.editIndex];
  if (!row) return;
  const q = $('#art-dialog-search').value.toLowerCase().trim();
  const used = new Map(state.rows.map((r, index) => [r.artwork ? fileKey(r.artwork) : '', index]).filter(([key]) => key));
  const options = state.art
    .filter((art) => !q || filePath(art).toLowerCase().includes(q))
    .map((art) => ({ art, ...pairScore(row.audio, art) }))
    .sort((a, b) => b.score - a.score || a.art.name.localeCompare(b.art.name))
    .slice(0, 80);
  $('#art-dialog-list').innerHTML = options.length ? options.map(({ art, score, reason }) => {
    const inUse = used.get(fileKey(art));
    return `<div class="art-option"><div><strong title="${escapeHtml(filePath(art))}">${escapeHtml(art.name)}</strong><small>${Math.round(score * 100)}% • ${escapeHtml(reason)}${inUse !== undefined && inUse !== state.editIndex ? ` • used by #${inUse + 1}` : ''}</small></div><button type="button" data-use-art="${escapeHtml(fileKey(art))}">Use</button></div>`;
  }).join('') : '<p class="muted">No artwork files match that search.</p>';
  $$('[data-use-art]', $('#art-dialog-list')).forEach((button) => button.addEventListener('click', () => useArtwork(button.dataset.useArt)));
}

async function useArtwork(key) {
  const art = state.art.find((file) => fileKey(file) === key);
  const index = state.editIndex;
  if (!art || index === null) return;
  const conflict = state.rows.findIndex((row, rowIndex) => rowIndex !== index && row.artwork && fileKey(row.artwork) === key);
  if (conflict !== -1) {
    state.rows[conflict].artwork = null;
    state.rows[conflict].matched = false;
    state.rows[conflict].score = 0;
    state.rows[conflict].confidence = 'unmatched';
    state.rows[conflict].reason = 'Artwork reassigned manually';
    state.rows[conflict].artValidation = { ok: false, errors: ['No matched artwork'], warnings: [] };
  }
  const scored = pairScore(state.rows[index].audio, art);
  Object.assign(state.rows[index], { artwork: art, matched: true, score: scored.score, confidence: scored.score >= .85 ? 'high' : scored.score >= .7 ? 'medium' : 'review', reason: `Manual selection • ${scored.reason}` });
  await validateArtworkForRow(state.rows[index]);
  $('#art-dialog').close();
  renderQueue();
  updateStats();
}

function batchManifests() {
  const template = readTemplateFromForm();
  return state.rows.map((row, index) => buildSingleManifest(template, row, index));
}

function exportJson() {
  if (!state.rows.length) { toast('Build a batch first'); return; }
  saveTemplate({ quiet: true });
  const payload = {
    schema: 'distroprep.personal.bulk1000.collection.v1',
    createdAt: new Date().toISOString(),
    batchSize: state.rows.length,
    inheritedMetadata: readTemplateFromForm(),
    releases: batchManifests(),
  };
  download(`distroprep-batch-${state.rows.length}-releases.json`, JSON.stringify(payload, null, 2));
  toast('Batch JSON exported');
}

function exportCsv() {
  if (!state.rows.length) { toast('Build a batch first'); return; }
  saveTemplate({ quiet: true });
  const template = readTemplateFromForm();
  const headers = ['batch_index','artist','release_title','song_title','audio_file','audio_path','artwork_file','artwork_path','art_match_percent','art_match_confidence','release_date','label','language','primary_genre','secondary_genre','songwriters','producer','performer','explicit','radio_edit','instrumental','spotify_artist','apple_artist','youtube_artist','audio_valid','artwork_valid'];
  const rows = state.rows.map((row, index) => [index + 1, template.artistName, row.title, row.title, row.audio.name, filePath(row.audio), row.artwork?.name || '', row.artwork ? filePath(row.artwork) : '', Math.round((row.score || 0) * 100), row.confidence, template.releaseDate, template.recordLabel, template.language, template.primaryGenre, template.secondaryGenre, template.songwriters, template.producer, template.performer, template.explicit, template.radioEdit, template.instrumental, template.artistMapping.spotify, template.artistMapping.appleMusic, template.artistMapping.youtubeMusic, row.audioValidation?.ok, row.artValidation?.ok]);
  download(`distroprep-batch-${state.rows.length}-releases.csv`, [headers, ...rows].map((line) => line.map(csv).join(',')).join('\n'), 'text/csv');
  toast('Batch CSV exported');
}

function clearBatch() {
  state.audio = []; state.art = []; state.rows = []; state.artMeta.clear(); state.page = 0;
  $('#audio-folder-input').value = ''; $('#audio-files-input').value = ''; $('#art-folder-input').value = ''; $('#art-files-input').value = '';
  $('#audio-message').textContent = 'No masters loaded.'; $('#art-message').textContent = 'No artwork loaded.'; setProcessing('Waiting for folders.');
  updateStats(); renderQueue();
}

$('#audio-folder-input').addEventListener('change', (event) => setAudioFiles(event.target.files));
$('#audio-files-input').addEventListener('change', (event) => setAudioFiles(event.target.files));
$('#art-folder-input').addEventListener('change', (event) => setArtFiles(event.target.files));
$('#art-files-input').addEventListener('change', (event) => setArtFiles(event.target.files));
$('#smart-match').addEventListener('click', runSmartMatch);
$('#clear-batch').addEventListener('click', clearBatch);
$('#load-previous').addEventListener('click', () => { loadStoredTemplate(); toast('Previous metadata reloaded'); });
$('#save-template').addEventListener('click', () => saveTemplate());
$('#export-json').addEventListener('click', exportJson);
$('#export-csv').addEventListener('click', exportCsv);
$('#jump-intake').addEventListener('click', () => $('#intake').scrollIntoView({ behavior: 'smooth' }));
$('#queue-search').addEventListener('input', (event) => { state.query = event.target.value; state.page = 0; renderQueue(); });
$('#queue-filter').addEventListener('change', (event) => { state.filter = event.target.value; state.page = 0; renderQueue(); });
$('#page-prev').addEventListener('click', () => { if (state.page > 0) { state.page -= 1; renderQueue(); } });
$('#page-next').addEventListener('click', () => { const pages = Math.ceil(filteredRows().length / PAGE_SIZE); if (state.page < pages - 1) { state.page += 1; renderQueue(); } });
$('#art-dialog-search').addEventListener('input', renderArtworkOptions);
$$('[data-template]').forEach((input) => input.addEventListener('input', () => { readTemplateFromForm(); $('#template-status').textContent = 'Unsaved changes'; $('#template-status').className = 'status-chip'; }));

loadStoredTemplate();
updateStats();
renderQueue();
