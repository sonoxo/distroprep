<div align="center">

# 🎛️ DISTROPREP PERSONAL
### **From studio folder → release-ready package.**

**A local-first release preparation workspace for independent musicians using DistroKid.**

[![Personal Account Mode](https://img.shields.io/badge/mode-personal%20accounts-b8ff2c?style=for-the-badge&labelColor=11111a)](#-personal-account-mode)
[![No Credentials Stored](https://img.shields.io/badge/privacy-no%20credentials%20stored-8c5cff?style=for-the-badge&labelColor=11111a)](#-privacy-first)
[![Tests](https://img.shields.io/badge/tests-node%20built--in-7df5b2?style=for-the-badge&labelColor=11111a)](#-development)
[![License: MIT](https://img.shields.io/badge/license-MIT-f7f4ff?style=for-the-badge&labelColor=11111a)](LICENSE)

**🎵 Masters • 🖼️ Cover art • 🧾 Metadata • ✅ Validation • 📦 Release manifests**

</div>

---

## ⚡ Why DistroPrep?

Finishing the song is creative. Preparing the release is admin.

DistroPrep keeps that admin from wrecking your momentum.

Drop in your masters and artwork, enter the release information once, catch common DistroKid formatting problems before upload, then keep a clean JSON/CSV manifest beside your music. When the package is ready, DistroPrep opens the official DistroKid upload page for your final review and submission.

> **Built for musicians who would rather spend the night making records than retyping metadata.**

---

## 🎚️ What it does

### Release Builder

Build a single, EP, or album using a field order designed around the current DistroKid upload workflow:

- Services
- Number of songs
- Previously released / original release date
- Artist / band name
- Existing Spotify / Apple Music / YouTube Music artist mapping
- Release date
- Record label
- Album cover
- Album / EP title
- Album price reference
- Language
- Primary + secondary genre
- Track metadata
- Additional artists and roles
- Apple performer + producer credits
- Final rights / spelling / store-review checklist

### Track metadata

Each track can carry:

- Song title
- Featured artist, remixer, or additional primary artist
- Version information
- Existing ISRC reference
- Original song / cover-song status
- Songwriter / composer legal names
- Original artist + title for cover songs
- Explicit flag
- Radio-edit flag
- Instrumental flag
- Apple Digital Master flag
- Preview start time
- Track-price reference

### Bulk Singles Queue

Select a stack of masters and a stack of covers. DistroPrep automatically pairs them by normalized filename.

```text
01 Neon Rain.wav
Neon Rain Cover.jpg

02 Cold Summer.flac
Cold_Summer_artwork.jpg
```

Both pairs are recognized automatically.

The queue lets you prepare many personal-account singles while keeping each song/artwork pair visible and exportable.

---

## 🖤 Built for the studio workflow

```text
┌─────────────────────────────────────────────────────────┐
│  DISTROPREP PERSONAL                                    │
├─────────────────────────────────────────────────────────┤
│  🎧 18 masters loaded                                   │
│  🖼️ 18 covers matched                                   │
│  ✅ artwork dimensions checked                          │
│  ✅ filenames checked                                   │
│  ✅ metadata packaged                                   │
│                                                         │
│  [ EXPORT JSON ] [ EXPORT CSV ] [ OPEN DISTROKID ↗ ]   │
└─────────────────────────────────────────────────────────┘
```

The UI is intentionally dark, high-contrast, and studio-friendly so release prep feels more like part of the music workflow and less like paperwork.

---

## ✅ Current DistroKid-oriented checks

DistroPrep currently checks or surfaces the following rules from DistroKid's public upload documentation:

### Audio

Accepted extensions:

```text
WAV • MP3 • M4A • FLAC • AIFF • WMA
```

It checks:

- supported extension
- 1 GB per-track maximum
- invalid filename characters
- album known-duration limit of 10 hours
- average-duration warning for multi-track releases
- lossy-source warning when MP3/M4A/WMA is selected

DistroKid notes that WAV or FLAC is preferred when a lossless master is available.

### Artwork

DistroPrep targets:

```text
JPG
minimum: 1000 × 1000
recommended: 3000 × 3000
square artwork preferred
RGB color mode required by DistroKid
```

The browser checks the file type and pixel dimensions. Because browser image APIs do not reliably expose every source color-profile detail, DistroPrep reminds you to confirm RGB color mode before final submission.

Official references:

- DistroKid upload-form guide: https://support.distrokid.com/hc/en-us/articles/4407879306643-Understanding-the-Upload-Form
- Track-information guide: https://support.distrokid.com/hc/en-us/articles/39974262480019-Entering-Track-Information-on-the-Upload-Form
- Audio formats: https://support.distrokid.com/hc/en-us/articles/360013647753-What-Audio-File-Formats-Can-I-Upload
- Artwork requirements: https://support.distrokid.com/hc/en-us/articles/360013534334-What-Are-the-Requirements-for-Album-Artwork

---

## 🔒 Personal-account mode

**Version 1 is intentionally for personal account workflows.**

DistroPrep does **not**:

- ask for your DistroKid username or password
- save DistroKid session cookies
- impersonate you on DistroKid
- auto-submit releases through the DistroKid website
- bypass DistroKid permissions, account limits, or paid-plan features

It prepares the files and metadata locally and then sends you to the official upload page:

https://distrokid.com/new/

This keeps the first version useful without turning your distributor login into an automation credential.

---

## 🛡️ Privacy first

Your selected audio and artwork stay in the browser session. The project has no backend, database, analytics SDK, or account system.

Metadata drafts use your browser's local storage. File objects themselves are **not** persisted there.

Exported manifests contain filenames and metadata — not copies of your audio masters.

---

## 🚀 Run it locally

No package manager or framework is required.

Clone the repository and serve the folder with any static web server, or simply use the project through a GitHub Pages/static deployment.

For Python users:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Because DistroPrep is plain HTML/CSS/JavaScript, it can be hosted on GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, or nearly any web server.

---

## 📦 Export formats

### JSON manifest

Keeps detailed release structure for archiving, future tools, and later automation adapters.

### CSV manifest

Creates a catalog-friendly row-per-track file that can be opened in Excel, Numbers, Google Sheets, Airtable, or catalog-management software.

---

## 🧪 Development

No dependency install is needed for the validator test suite.

```bash
node --test tests/validator.test.mjs
node --check app.js
```

The GitHub Actions workflow runs these checks on pushes and pull requests.

---

## 🗺️ Roadmap

### v1 — Personal Release Prep ✅

- [x] Single / EP / album builder
- [x] Bulk master intake
- [x] Bulk cover-art matching
- [x] DistroKid-oriented metadata structure
- [x] Artwork validation
- [x] Audio validation
- [x] JSON export
- [x] CSV export
- [x] Local metadata drafts
- [x] Official DistroKid handoff

### Later

- [ ] Catalog templates
- [ ] Saved artist profiles
- [ ] Credits library
- [ ] Release history
- [ ] UPC / ISRC catalog ledger
- [ ] Lyrics packages
- [ ] Multi-distributor adapters
- [ ] Official API integrations where a distributor provides and permits them

---

## 🤝 For musicians, by independent builders

If you are an artist, producer, label owner, engineer, or catalog manager and you see a piece of release admin that should be easier, open an issue.

Good feature requests describe the **actual studio/release workflow** rather than just the button you want added.

---

## ⚖️ Project notice

DistroPrep is an independent open-source project and is **not affiliated with, endorsed by, or sponsored by DistroKid**. DistroKid and related marks belong to their respective owners. DistroKid's upload requirements and interface may change; always review the official upload form before final submission.

Use DistroPrep only with audio, artwork, and metadata you have the rights or permission to distribute.

---

<div align="center">

### **Make the record. Prep the release. Keep moving.** 🎚️🔥

MIT Licensed • Personal-account mode • Local-first

</div>
