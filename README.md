<div align="center">

![DISTROPREP command-center flow](docs/assets/command-center.svg)

# DISTROPREP

**LOCAL-FIRST RELEASE COMMAND CENTER**

[![Sonoxo](https://img.shields.io/badge/SONOXO-ECOSYSTEM-7c3aed?style=for-the-badge)](https://github.com/sonoxo)
![Status](https://img.shields.io/badge/STATUS-WORKING%20STATIC%20APP-111827?style=for-the-badge)

</div>

## What it is

DistroPrep is a local-first browser workspace for independent musicians preparing personal-account release data. It can intake up to 1,000 masters and 1,000 JPG/JPEG covers, inherit reusable metadata, match artwork locally, validate common issues, and export JSON or CSV.

## The four-step flow

1. **Load** master and artwork folders.
2. **Match** songs to covers using filenames, track numbers, folder identity, tokens, and fuzzy similarity.
3. **Review** low-confidence pairs plus audio and image warnings.
4. **Export** a release queue, then complete the official distributor upload yourself.

## Run it

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/index.html` for the Release Builder or `http://localhost:8080/bulk1000.html` for 1,000 Song Mode.

## Privacy and boundaries

Audio and cover files stay in the browser session. Metadata text may use browser local storage. There is no DistroPrep backend, account database, cloud-AI file processing, or automatic DistroKid submission. DistroPrep is not affiliated with DistroKid.

## Verify the code

```bash
node --test tests/*.test.mjs
node --check app.js
node --check bulk1000.mjs
node --check smart-match.mjs
node --check release-template.mjs
```

## Status

The static release builder, bulk intake, local smart matching, review filters, validation, JSON export, and CSV export are implemented. Future distributor adapters remain roadmap work and require official APIs and permitted automation.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**SONOXO ECOSYSTEM** · Built to make complex tools understandable

The header animation automatically becomes static when your system requests reduced motion.

</div>
