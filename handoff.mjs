export function releaseKey({ index = 0, title = '', audioFile = '', artworkFile = '' } = {}) {
  return [index, title, audioFile, artworkFile].map((value) => String(value || '').trim().toLowerCase()).join('::');
}

export function handoffReadiness({ title = '', audioFile = '', artworkFile = '', artistName = '', audioValid = false, artworkValid = false } = {}) {
  const issues = [];
  if (!String(title).trim()) issues.push('Song title is missing.');
  if (!String(artistName).trim()) issues.push('Artist / band name is missing.');
  if (!String(audioFile).trim()) issues.push('Master audio file is missing.');
  if (!String(artworkFile).trim() || /no artwork/i.test(String(artworkFile))) issues.push('Matched artwork is missing.');
  if (!audioValid) issues.push('Audio file still needs review.');
  if (!artworkValid) issues.push('Artwork still needs review.');
  return { ok: issues.length === 0, issues };
}

export function nextPendingIndex(releases = [], completedKeys = new Set(), currentIndex = -1) {
  if (!releases.length) return -1;
  for (let offset = 1; offset <= releases.length; offset += 1) {
    const index = (currentIndex + offset + releases.length) % releases.length;
    const key = releases[index]?.key;
    if (key && !completedKeys.has(key)) return index;
  }
  return -1;
}

const STORAGE_KEY = 'distroprep-handoff-completed-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function loadCompleted() {
  try { return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveCompleted(completed) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
}

function templateData() {
  const out = {};
  $$('[data-template]').forEach((input) => {
    out[input.dataset.template] = input.value ?? '';
  });
  return out;
}

function readRow(tr) {
  if (!tr || !tr.dataset.row) return null;
  const index = Number(tr.dataset.row);
  const title = $('.title-edit', tr)?.value?.trim() || '';
  const cells = $$('td', tr);
  const audioFile = $('strong', cells[2])?.textContent?.trim() || '';
  const artworkStrong = $('strong', cells[3]);
  const artworkFile = artworkStrong?.textContent?.trim() || '';
  const check = $('.check-badge', tr);
  const audioValid = !/audio issue/i.test(check?.textContent || '') && Boolean(audioFile);
  const artworkValid = !/art issue|art missing|checking/i.test(check?.textContent || '') && Boolean(artworkFile) && !/no artwork/i.test(artworkFile);
  const meta = templateData();
  const data = {
    index,
    title,
    audioFile,
    artworkFile,
    artistName: meta.artistName || '',
    audioValid,
    artworkValid,
    meta,
  };
  data.key = releaseKey(data);
  data.readiness = handoffReadiness(data);
  return data;
}

function currentRows() {
  return $$('#queue-body tr[data-row]').map(readRow).filter(Boolean);
}

function fieldRows(data) {
  const m = data.meta;
  const fields = [
    ['Artist / band name', m.artistName],
    ['Release title', data.title],
    ['Song title', data.title],
    ['Release date', m.releaseDate],
    ['Record label', m.recordLabel],
    ['Language', m.language],
    ['Primary genre', m.primaryGenre],
    ['Secondary genre', m.secondaryGenre],
    ['Songwriter / composer', m.songwriters],
    ['Producer', m.producer],
    ['Performer', m.performer],
    ['Explicit', m.explicit],
    ['Radio edit', m.radioEdit],
    ['Instrumental', m.instrumental],
    ['Apple Digital Master', m.appleDigitalMaster],
    ['Preview start', m.previewStart],
    ['Track price', m.trackPrice],
    ['Spotify artist mapping', m['artistMapping.spotify']],
    ['Apple Music artist mapping', m['artistMapping.appleMusic']],
    ['YouTube Music artist mapping', m['artistMapping.youtubeMusic']],
    ['MASTER FILE', data.audioFile],
    ['ARTWORK FILE', data.artworkFile],
  ];
  return fields.filter(([, value]) => String(value ?? '').trim());
}

async function copyText(value) {
  await navigator.clipboard.writeText(String(value ?? ''));
}

function addStyles() {
  if ($('#distroprep-handoff-style')) return;
  const style = document.createElement('style');
  style.id = 'distroprep-handoff-style';
  style.textContent = `
    .handoff-launch{display:inline-flex;align-items:center;gap:8px}.handoff-row-button{background:rgba(140,92,255,.12);border:1px solid rgba(140,92,255,.35);color:#d8caff!important}.handoff-submitted{display:inline-flex;margin-top:5px;padding:4px 7px;border-radius:999px;background:rgba(125,245,178,.13);border:1px solid rgba(125,245,178,.25);color:#7df5b2;font-size:.68rem;font-weight:900}.handoff-dialog{width:min(860px,94vw);max-height:90vh;border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:0;background:#101018;color:#f7f4ff;box-shadow:0 34px 110px rgba(0,0,0,.7)}.handoff-dialog::backdrop{background:rgba(0,0,0,.76);backdrop-filter:blur(6px)}.handoff-card{padding:22px;overflow:auto;max-height:90vh}.handoff-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.handoff-head h2{margin:4px 0}.handoff-status{padding:10px 12px;border-radius:12px;margin:14px 0;background:rgba(125,245,178,.09);border:1px solid rgba(125,245,178,.2);color:#a8ffd0}.handoff-status.bad{background:rgba(255,94,125,.08);border-color:rgba(255,94,125,.22);color:#ff9aad}.handoff-files{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.handoff-file{padding:13px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}.handoff-file span{display:block;color:#8f8ca0;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em}.handoff-file strong{display:block;margin-top:5px;word-break:break-word}.handoff-grid{display:grid;gap:7px;margin:14px 0}.handoff-field{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(0,1.4fr) auto;gap:10px;align-items:center;padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}.handoff-field label{color:#9f9caf;font-size:.78rem;font-weight:800}.handoff-field code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f7f4ff}.handoff-field button{padding:6px 9px;font-size:.72rem}.handoff-actions{display:flex;gap:9px;flex-wrap:wrap;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.handoff-note{font-size:.83rem;color:#9f9caf;line-height:1.5}.handoff-close{border:0;background:transparent;color:#fff;font-size:1.7rem;cursor:pointer}.handoff-mini{font-size:.75rem;color:#8f8ca0}.handoff-actions .primary,.handoff-actions .secondary{min-height:40px}@media(max-width:700px){.handoff-files{grid-template-columns:1fr}.handoff-field{grid-template-columns:1fr auto}.handoff-field label{grid-column:1/-1}.handoff-field code{white-space:normal;word-break:break-word}}
  `;
  document.head.append(style);
}

let completed = new Set();
let activeKey = null;

function ensureDialog() {
  if ($('#handoff-dialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="handoff-dialog" class="handoff-dialog">
      <div class="handoff-card">
        <div class="handoff-head"><div><span class="eyebrow">DISTROKID HANDOFF</span><h2 id="handoff-title">Ready-to-Submit Assistant</h2><p class="handoff-mini">DistroPrep keeps the prepared release beside DistroKid. You attach the named local files and perform the final submission yourself.</p></div><button type="button" class="handoff-close" id="handoff-close" aria-label="Close">×</button></div>
        <div id="handoff-status" class="handoff-status"></div>
        <div class="handoff-files"><div class="handoff-file"><span>Master to attach</span><strong id="handoff-audio"></strong></div><div class="handoff-file"><span>Artwork to attach</span><strong id="handoff-art"></strong></div></div>
        <div id="handoff-fields" class="handoff-grid"></div>
        <p class="handoff-note"><strong>Account-safe mode:</strong> this assistant does not log into DistroKid, inject cookies, control DistroKid's form, or press Submit. Browser security also prevents DistroPrep from silently attaching your local files to another website. Keep both tabs open and use the prepared values shown here.</p>
        <div class="handoff-actions"><button type="button" class="secondary" id="handoff-copy-all">Copy all metadata</button><a class="primary button-link" id="handoff-open-dk" href="https://distrokid.com/new/" target="_blank" rel="noopener noreferrer">Open DistroKid ↗</a><button type="button" class="primary" id="handoff-done-next">I submitted this — Next →</button></div>
      </div>
    </dialog>
  `);
  $('#handoff-close').addEventListener('click', () => $('#handoff-dialog').close());
  $('#handoff-copy-all').addEventListener('click', async () => {
    const tr = $(`#queue-body tr[data-row="${CSS.escape(String(activeKey?.index ?? ''))}"]`);
    const data = tr ? readRow(tr) : null;
    if (!data) return;
    const text = fieldRows(data).map(([label, value]) => `${label}: ${value}`).join('\n');
    await copyText(text);
    $('#handoff-copy-all').textContent = 'Copied ✓';
    setTimeout(() => { $('#handoff-copy-all').textContent = 'Copy all metadata'; }, 1200);
  });
  $('#handoff-done-next').addEventListener('click', () => markDoneAndNext());
}

function refreshRowButtons() {
  $$('#queue-body tr[data-row]').forEach((tr) => {
    const actions = $('.row-actions', tr);
    const data = readRow(tr);
    if (!actions || !data) return;
    if (!$('.handoff-row-button', actions)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'handoff-row-button';
      button.textContent = 'Prepare';
      button.addEventListener('click', () => openHandoff(tr));
      actions.prepend(button);
    }
    let badge = $('.handoff-submitted', tr);
    if (completed.has(data.key)) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'handoff-submitted';
        badge.textContent = '✓ submitted';
        const checkCell = $$('td', tr)[5];
        checkCell?.append(document.createElement('br'), badge);
      }
    } else badge?.remove();
  });
}

function openHandoff(tr) {
  const data = readRow(tr);
  if (!data) return;
  activeKey = data;
  $('#handoff-title').textContent = `#${data.index + 1} • ${data.title || 'Untitled release'}`;
  $('#handoff-audio').textContent = data.audioFile || 'No master selected';
  $('#handoff-art').textContent = data.artworkFile || 'No artwork matched';
  const status = $('#handoff-status');
  status.className = `handoff-status${data.readiness.ok ? '' : ' bad'}`;
  status.innerHTML = data.readiness.ok ? '✓ DistroPrep checks are ready for handoff. Review the official DistroKid form before submitting.' : `<strong>Needs review:</strong> ${escapeHtml(data.readiness.issues.join(' '))}`;
  $('#handoff-fields').innerHTML = fieldRows(data).map(([label, value]) => `<div class="handoff-field"><label>${escapeHtml(label)}</label><code title="${escapeHtml(value)}">${escapeHtml(value)}</code><button type="button" data-copy-value="${escapeHtml(value)}">Copy</button></div>`).join('');
  $$('[data-copy-value]', $('#handoff-fields')).forEach((button) => button.addEventListener('click', async () => {
    await copyText(button.dataset.copyValue || '');
    button.textContent = '✓';
    setTimeout(() => { button.textContent = 'Copy'; }, 900);
  }));
  $('#handoff-done-next').disabled = false;
  $('#handoff-dialog').showModal();
}

function openFirstPendingVisible() {
  refreshRowButtons();
  const rows = currentRows();
  if (!rows.length) return false;
  const start = nextPendingIndex(rows, completed, -1);
  if (start === -1) return false;
  const tr = $$('#queue-body tr[data-row]')[start];
  if (tr) { openHandoff(tr); return true; }
  return false;
}

function markDoneAndNext() {
  if (!activeKey) return;
  completed.add(activeKey.key);
  saveCompleted(completed);
  refreshRowButtons();
  const rows = currentRows();
  const current = rows.findIndex((row) => row.key === activeKey.key);
  const next = nextPendingIndex(rows, completed, current);
  if (next !== -1) {
    const tr = $$('#queue-body tr[data-row]')[next];
    if (tr) { openHandoff(tr); return; }
  }
  const nextPage = $('#page-next');
  if (nextPage && !nextPage.disabled) {
    $('#handoff-dialog').close();
    nextPage.click();
    setTimeout(() => {
      refreshRowButtons();
      if (!openFirstPendingVisible()) alert('No pending releases are visible on this page.');
    }, 120);
    return;
  }
  $('#handoff-dialog').close();
  alert('All currently loaded releases have been marked submitted in this browser session.');
}

function installLaunchButton() {
  const finalPanel = $('.final-panel');
  if (!finalPanel || $('#handoff-launch')) return;
  const actions = document.createElement('div');
  actions.className = 'handoff-actions';
  actions.innerHTML = '<button type="button" class="primary handoff-launch" id="handoff-launch">🎚️ Start Ready-to-Submit Assistant</button>';
  finalPanel.append(actions);
  $('#handoff-launch').addEventListener('click', () => {
    if (!openFirstPendingVisible()) alert('Build the prepared singles queue first.');
  });
}

function init() {
  completed = loadCompleted();
  addStyles();
  ensureDialog();
  installLaunchButton();
  refreshRowButtons();
  const queue = $('#queue-body');
  if (queue) new MutationObserver(() => refreshRowButtons()).observe(queue, { childList: true, subtree: true });
  $('#clear-batch')?.addEventListener('click', () => { completed = new Set(); saveCompleted(completed); activeKey = null; });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}
