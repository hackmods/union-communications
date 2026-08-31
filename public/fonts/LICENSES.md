# Canvas brand fonts — licenses

Self-hosted for Comms Brand Kit / export canvases only (ADR-014).
No remote font CDN at runtime. All faces below are licensed under the
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).

| Family | Source | Files |
|--------|--------|-------|
| Montserrat | Julieta Ulanovsky et al. | `montserrat/*.woff2`, `*.ttf` |
| Source Sans 3 | Adobe (Paul D. Hunt) | `source-sans-3/*.woff2`, `*.ttf` |
| Lato | Łukasz Dziedzic | `lato/*.woff2`, `*.ttf` |
| Barlow Condensed | Jeremy Tribby | `barlow-condensed/*.woff2`, `*.ttf` |
| Oswald | Vernon Adams et al. | `oswald/*.woff2`, `*.ttf` |
| Source Serif 4 | Adobe (Frank Grießhammer) | `source-serif-4/*.woff2`, `*.ttf` |
| Roboto Slab | Google / Christian Robertson | `roboto-slab/*.woff2`, `*.ttf` |

Latin subsets obtained via Fontsource builds (same OFL upstream).
Matching `.ttf` siblings are generated via `npm run fonts:sync-ttf` (wawoff2
decompress of the same Latin subsets) for jsPDF text-PDF embed and future
OOXML packaging — still OFL; do not sell the fonts alone.
System residual faces (`systemSans`, `systemSerif`) use OS-installed fonts
and are not bundled here.
