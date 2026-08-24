const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const dropped = { audio: [], art: [] };

function key(file) {
  return `${file._distroprepPath || file.webkitRelativePath || file.name}::${file.size || 0}::${file.lastModified || 0}`;
}

function unique(files) {
  const seen = new Set();
  return files.filter((file) => {
    const id = key(file);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function markPath(file, path) {
  if (!path) return file;
  try { Object.defineProperty(file, '_distroprepPath', { value: path, configurable: true }); }
  catch { try { file._distroprepPath = path; } catch {} }
  return file;
}

async function readAll(reader) {
  const items = [];
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) return items;
    items.push(...batch);
  }
}

async function walk(entry, prefix = '') {
  if (!entry) return [];
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [markPath(file, path)];
  }
  if (entry.isDirectory) {
    const children = await readAll(entry.createReader());
    return (await Promise.all(children.map((child) => walk(child, path)))).flat();
  }
  return [];
}

async function filesFromDrop(dataTransfer) {
  const entries = [...(dataTransfer?.items || [])].map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) return (await Promise.all(entries.map((entry) => walk(entry)))).flat();
  return [...(dataTransfer?.files || [])];
}

function sendFiles(files, targetInput) {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  targetInput.files = transfer.files;
  targetInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function wireDropZone(zoneSelector, targetSelector, kind) {
  const zone = $(zoneSelector);
  const target = $(targetSelector);
  if (!zone || !target) return;
  let depth = 0;
  const setActive = (active) => zone.classList.toggle('is-dragover', active);

  zone.addEventListener('dragenter', (event) => { event.preventDefault(); depth += 1; setActive(true); });
  zone.addEventListener('dragover', (event) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; setActive(true); });
  zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) setActive(false); });
  zone.addEventListener('drop', async (event) => {
    event.preventDefault(); depth = 0; setActive(false); zone.classList.add('is-processing');
    try {
      const files = await filesFromDrop(event.dataTransfer);
      dropped[kind] = unique([...dropped[kind], ...files]).slice(0, 1000);
      sendFiles(dropped[kind], target);
      const message = kind === 'audio' ? $('#audio-message') : $('#art-message');
      if (message) message.dataset.dragDrop = 'true';
    } catch (error) {
      console.error('DistroPrep folder drop failed', error);
      const status = $('#processing-status');
      if (status) status.textContent = 'Folder drag could not be read. Use the folder picker as a fallback.';
    } finally {
      zone.classList.remove('is-processing');
    }
  });
}

function wireDatePickers() {
  $$('input[type="date"]').forEach((input) => {
    input.addEventListener('click', () => { try { input.showPicker?.(); } catch {} });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { try { input.showPicker?.(); } catch {} }
    });
  });
  $$('[data-date-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.dateTarget);
      if (!input) return;
      input.focus();
      try { input.showPicker?.(); } catch { input.click(); }
    });
  });
}

wireDropZone('#audio-drop-zone', '#audio-files-input', 'audio');
wireDropZone('#art-drop-zone', '#art-files-input', 'art');
wireDatePickers();
