# Night Index: The Quiet Forecast

An interactive Three.js horror story experienced through the teletext pages of
an impossible late-night television broadcast. At 02:13, Bellwether's local
station begins printing the name of Mara Venn, a woman the town has erased from
its memory.

**▶️ Play: https://Santein.github.io/night-index/**

[![Night Index: The Quiet Forecast title screen](https://raw.githubusercontent.com/Santein/night-index/main/public/og.png)](https://Santein.github.io/night-index/)

Tune numbered pages through a vintage television in a quiet motel room. Follow
clues hidden in weather reports, police carbon copies, and an impossible mirror
feed. Your choices leave traces on later broadcasts and decide what Bellwether
will remember when the 02:17 siren arrives.

The story is designed as a short, replayable choose-your-own-adventure with
four different endings. The game supports keyboard, mouse, and touch controls,
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
