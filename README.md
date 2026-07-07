# OPSEU Local Social Media Toolbox

A privacy-first web platform for volunteer union executives and communicators. Provides guides, templates, and automated image-generation tools to help OPSEU locals run professional social media accounts.

**Default audience:** CAAT OPSEU Support Staff locals (customizable for other divisions).

## Features

- **Education:** The Blueprint guide, Crisis Comms Playbook, Notice Board examples, Caption library
- **Tools:** Logo Builder, Graphic Maker, Omnichannel Resizer, Quote Card, Flyer Maker, Alt-Text Assistant
- **Brand Kit:** Export/import local branding as JSON
- **CAAT OPSEU Assets:** Official logos, colour swatches, usage guidelines
- **Bilingual:** Full English and French UI
- **Privacy:** All processing on-device — no data sent to servers

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to out/
npm run test:unit  # Vitest unit tests
npm run test:smoke # Playwright smoke tests
```

## Deployment

Static export deployable to Vercel, Netlify, or GitHub Pages:

```bash
npm run build
# Output in out/ directory
```

Security headers configured in `vercel.json`.

## Project structure

```
src/
  app/[locale]/     # Pages with i18n routing
  components/       # UI, layout, tools, providers
  lib/              # Constants, data adapter, export, utils
  store/            # Zustand brand store
  hooks/            # useUndoRedo, etc.
  types/            # Entity types (Local, Division, BrandKit)
messages/           # en.json, fr.json
docs/               # PROGRESS.md, DECISIONS.md
e2e/                # Playwright tests
```

## License

Built for OPSEU locals by union volunteers.
