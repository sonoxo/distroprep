<div align="center">

# 🎛️⚡ DISTROPREP PERSONAL
## **Drop the folder. Match the covers. Keep releasing.**

### A local-first release-prep cockpit for independent musicians using DistroKid.

[![1,000 Song Mode](https://img.shields.io/badge/BATCH-1%2C000%20SONGS-b8ff2c?style=for-the-badge&labelColor=11111a)](bulk1000.html)
[![Previous Release Metadata](https://img.shields.io/badge/METADATA-INHERIT%20PREVIOUS-8c5cff?style=for-the-badge&labelColor=11111a)](#-previous-release-memory)
[![Local Smart Match](https://img.shields.io/badge/ART-SMART%20MATCH-7df5b2?style=for-the-badge&labelColor=11111a)](#-smart-artwork-matching)
[![Personal Account Mode](https://img.shields.io/badge/MODE-PERSONAL%20ACCOUNTS-f7f4ff?style=for-the-badge&labelColor=11111a)](#-personal-account-mode)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-f7f4ff?style=for-the-badge&labelColor=11111a)](LICENSE)

**🎵 Masters • 🖼️ Cover Art • 🧬 Previous Metadata • ✨ Smart Matching • ✅ Validation • 📦 JSON/CSV**

> **Built for artists with catalogs — not just one upload at a time.**

</div>

---

## 🔥 The musician problem

You already made the records.

The part that burns time is everything after the bounce:

**find the master → find the right cover → retype the same artist info → retype the same label → retype the same credits → check dimensions → repeat.**

DistroPrep turns that repetitive release admin into a catalog workflow.

```text
STUDIO FOLDER
     │
     ├── 🎵 up to 1,000 masters
     ├── 🖼️ up to 1,000 covers
     │
     ▼
┌───────────────────────────────────────────────┐
│              DISTROPREP PERSONAL              │
│                                               │
│  🧬 inherit previous-release metadata         │
│  ✨ smart-match song ↔ artwork                │
│  ✅ validate masters + cover dimensions       │
│  👀 isolate anything that needs review        │
│  📦 export the whole release queue            │
└───────────────────────────────────────────────┘
     │
     ▼
OFFICIAL DISTROKID UPLOAD
final review + submission by the account owner
```

---

# ⚡ 1,000 Song Mode

The dedicated [`bulk1000.html`](bulk1000.html) workspace is designed for personal catalogs where the release metadata is mostly the same from song to song.

### Load the entire catalog in two moves

1. Select your **masters folder**.
2. Select your **artwork folder**.

DistroPrep accepts up to **1,000 audio masters in one batch** and up to **1,000 JPG/JPEG covers** for matching.

Folder intake works alongside regular multi-file selection, so users can fall back to selecting files directly when a browser does not expose folder selection.

### Supported audio intake

```text
WAV • FLAC • MP3 • M4A • AIFF • AIF • WMA
```

### Artwork intake

```text
JPG / JPEG
minimum check: 1000 × 1000
recommended target: 3000 × 3000
square preferred
```

---

# 🧬 Previous-release memory

DistroPrep is built around a simple idea:

> **If the artist, label, genre, credits, profile mappings, and release settings did not change, you should not have to type them again.**

The 1,000 Song Mode automatically looks for metadata from your previous DistroPrep release in browser local storage.

It can inherit:

- artist / band name
- record label
- release date
- services
- language
- primary genre
- secondary genre
- songwriter / composer legal names
- producer credit
- performer credit
- Spotify artist mapping
- Apple Music artist mapping
- YouTube Music artist mapping
- previously-released status
- original release date
- explicit flag
- radio-edit flag
- instrumental flag
- Apple Digital Master flag
- preview-start reference
- track-price reference

For a bulk-singles batch, the per-release differences are intentionally reduced to:

```text
SONG TITLE
AUDIO MASTER
COVER ART
```

The song title is derived from the master filename and remains editable before export.

When you click **Save as previous release**, that template becomes the starting metadata for the next batch in the same browser.

---

# ✨ Smart artwork matching

Naming 1,000 covers perfectly is not always realistic.

DistroPrep now includes a **local intelligent matching engine** that tries to identify which artwork belongs to which master without sending your files to an external AI service.

It combines multiple signals:

- normalized song filenames
- ignored track-number prefixes
- ignored words such as `cover`, `artwork`, `final`, `master`, and `mix`
- punctuation normalization
- shared title tokens
- fuzzy filename similarity
- matching track numbers
- folder-name identity
- one-cover-per-song assignment

Examples:

```text
01 Neon Rain FINAL.wav
Neon_Rain Cover.jpg
→ exact/high-confidence match
```

```text
Masters/Night Drive/master.wav
Artwork/Night Drive/cover.jpg
→ folder-identity match
```

```text
Money Talk (Master).flac
money-talk artwork.jpg
→ strong semantic filename match
```

Every match receives a confidence score. Low-confidence results are sent to **Needs Review** instead of silently being treated as correct.

You can manually change any cover using the searchable artwork picker.

### Performance target

The smart matcher has an automated test covering a **1,000 master / 1,000 cover batch**. Candidate indexing avoids doing a full expensive comparison of every possible pair when filenames already provide useful identity signals.

---

# 🎚️ Release Builder

The original Release Builder is still available for singles, EPs, and albums where each track needs more individual metadata.

It includes:

- services
- artist / band name
- release date
- original release date
- previously released status
- record label
- album / EP title
- language
- primary + secondary genre
- Spotify / Apple Music / YouTube Music profile mapping
- performer and producer credits
- song title
- additional artists / featured artists
- version information
- existing ISRC reference
- songwriter names
- cover-song information
- explicit / radio edit / instrumental flags
- Apple Digital Master flag
- preview start
- track-price reference

The regular **Bulk Singles Queue** remains available for smaller batches. For large catalogs, use **1,000 Song Mode**.

---

# 🧪 Local validation

DistroPrep checks common release-prep issues before you open the distributor form.

### Audio checks

- supported file extension
- 1 GB per-track maximum
- problematic filename characters
- lossy-source warning for MP3/M4A/WMA
- release duration checks in the standard Release Builder

### Artwork checks

- JPG/JPEG validation
- readable image
- minimum 1000×1000 dimensions
- square-art warning
- 3000×3000 recommendation
- RGB reminder

For a 1,000-song batch, matched artwork is dimension-checked with a limited-concurrency worker queue so the browser does not try to decode the entire catalog at once.

---

# 👀 Catalog review tools

Large batches need visibility, not a wall of 1,000 rows.

The new queue includes:

- 100-release pagination
- song/art filename search
- **All / Matched / Needs Review / Unmatched** filters
- match-confidence percentages
- master validation status
- artwork validation status
- manual art reassignment
- per-single JSON copy
- batch JSON export
- batch CSV export

```text
┌────┬─────────────────┬──────────────────┬──────────────────┬─────────┐
│ #  │ SONG            │ MASTER           │ ART              │ MATCH   │
├────┼─────────────────┼──────────────────┼──────────────────┼─────────┤
│ 1  │ Neon Rain       │ Neon Rain.wav    │ Neon Rain.jpg    │ 100% ✅ │
│ 2  │ Cold Summer     │ Cold Summer.wav  │ ColdSummer.jpg   │  93% ✅ │
│ 3  │ Night Drive     │ master.wav       │ cover.jpg        │  78% 👀 │
└────┴─────────────────┴──────────────────┴──────────────────┴─────────┘
```

---

# 📦 Export formats

## Batch JSON

Creates a structured collection containing:

- inherited release template
- one manifest per single
- master filename + relative folder path
- artwork filename + relative folder path
- match score + reason
- image dimensions
- validation output
- title / credits / metadata

## Batch CSV

Creates one row per prepared single for catalog work in:

- Excel
- Numbers
- Google Sheets
- Airtable
- catalog databases
- future distributor adapters

---

# 🔒 Personal-account mode

Version 1 remains deliberately scoped to **personal account workflows**.

DistroPrep does **not**:

- request your DistroKid password
- store DistroKid cookies
- impersonate your account
- bypass distributor permissions
- bypass paid-plan limits
- auto-submit the DistroKid website

It prepares the catalog, then hands you off to the official DistroKid upload page for review and submission.

This project is **not affiliated with, endorsed by, or sponsored by DistroKid**.

---

# 🛡️ Privacy-first architecture

Your music and cover files remain local to the browser session.

There is currently:

- no DistroPrep backend
- no DistroPrep account database
- no upload server
- no analytics SDK required by the app
- no cloud AI processing of your songs or artwork

Browser local storage is used for reusable **metadata text only**. Audio and artwork file objects are not saved there.

---

# 🚀 Run DistroPrep

DistroPrep is plain HTML/CSS/JavaScript and does not require a framework or package install.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Main Release Builder:

```text
http://localhost:8080/index.html
```

1,000 Song Mode:

```text
http://localhost:8080/bulk1000.html
```

It can also be hosted using GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, or another static web host.

---

# 🧪 Development & tests

No dependency install is required for the core tests.

```bash
node --test tests/*.test.mjs
node --check app.js
node --check bulk1000.mjs
node --check smart-match.mjs
node --check release-template.mjs
```

GitHub Actions runs the suite on pushes and pull requests.

Current automated coverage includes:

- audio/art validation
- exact artwork matching
- fuzzy matching
- folder-identity matching
- one-artwork-per-song assignment
- previous-release metadata conversion
- metadata inheritance across multiple singles
- 1,000-item match batch

---

# 🗺️ Roadmap

### v1 — Personal release preparation ✅

- [x] Single / EP / album Release Builder
- [x] Bulk Singles Queue
- [x] **1,000-song folder intake**
- [x] **1,000-cover folder intake**
- [x] **Previous-release metadata inheritance**
- [x] **Smart artwork matching**
- [x] Match confidence + review queue
- [x] Manual artwork reassignment
- [x] Audio validation
- [x] Artwork dimension validation
- [x] JSON export
- [x] CSV export
- [x] Local metadata memory
- [x] Official DistroKid handoff

### Later

- [ ] Saved artist profiles
- [ ] Multiple reusable metadata presets
- [ ] Release-history ledger
- [ ] UPC / ISRC catalog ledger
- [ ] Lyrics package manager
- [ ] Credits library
- [ ] Duplicate-master detection
- [ ] Audio fingerprint assistance
- [ ] Multi-distributor manifests
- [ ] Official distributor API adapters where an API exists and automation is permitted

---

# 🤝 Built for musicians with real catalogs

If you are sitting on 50 songs, 300 songs, or 1,000 songs, release administration should scale with the catalog.

Open an issue with the workflow that wastes your time and DistroPrep can keep growing around real independent-artist release needs.

---

<div align="center">

## **MAKE THE RECORD. DROP THE FOLDER. KEEP MOVING.** 🎚️⚡🔥

**DistroPrep Personal**

Local-first • Catalog-ready • MIT Licensed

</div>
