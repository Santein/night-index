import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Night Index game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Night Index: The Quiet Forecast<\/title>/i);
  assert.match(html, /Night Index/i);
  assert.match(html, /The Quiet Forecast/i);
  assert.match(html, /Tune channel 7/i);
  assert.match(html, /No spoken dialogue/i);
  assert.match(html, /data-testid="scene-host"/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("ships the story, receiver, and licensed local assets", async () => {
  const [game, story, renderer, packageJson, attribution] = await Promise.all([
    readFile(new URL("../app/TeletextGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/story.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/teletext-renderer.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../public/models/television/ATTRIBUTION.md",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(game, /Sound captions/);
  assert.match(game, /No spoken dialogue/);
  assert.match(game, /Reduced motion/);
  assert.match(game, /Reduced flashing/);
  assert.match(game, /readStoredEndings/);
  assert.match(story, /quiet-morning/);
  assert.match(story, /borrowed-dawn/);
  assert.match(story, /night-editor/);
  assert.match(story, /no-one-missing/);
  assert.match(renderer, /TELETEXT_COLUMNS = 40/);
  assert.match(renderer, /TELETEXT_ROWS = 24/);
  assert.match(packageJson, /"three":/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(attribution, /CC0/i);

  await Promise.all([
    access(
      new URL(
        "../public/models/television/Television_01_1k.gltf",
        import.meta.url,
      ),
    ),
    access(
      new URL(
        "../public/models/television/television-vintage.glb",
        import.meta.url,
      ),
    ),
    access(new URL("../public/fonts/Teletext50.otf", import.meta.url)),
  ]);

  assert.ok(projectRoot);
});
