# Night Index: The Quiet Forecast

An interactive Three.js horror story experienced through the teletext pages of
an impossible late-night television broadcast.

Follow page-number clues, make decisions that alter later broadcasts, and
uncover four endings. The game supports keyboard, mouse, and touch controls,
with reduced-motion, reduced-flashing, and sound-caption options.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm test
```

## Deployment

- `npm run build` creates the connected Sites deployment build.
- `npm run build:pages` creates a static export in `out/`.
- Pushing `main` automatically publishes the static export with GitHub Pages.

The television models and their licenses are documented in
`public/models/television/ATTRIBUTION.md`.
