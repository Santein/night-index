import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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
  assert.match(game, /Choose and confirm this ending on page 160/);
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

test("keeps every story page and ending reachable without broken links", async () => {
  const source = await readFile(
    new URL("../app/story.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const story = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );

  const flagNames = Object.keys(story.INITIAL_FLAGS);
  const receiptRequirements = {
    134: "rememberedMara",
    135: "forgotMara",
    142: "madePromise",
    143: "refusedPromise",
    152: "acceptedMara",
    153: "rejectedMara",
  };
  for (const [page, requiredFlag] of Object.entries(receiptRequirements)) {
    assert.ok(
      story.PAGE_REQUIREMENTS[page]?.includes(requiredFlag),
      `receipt page ${page} should require ${requiredFlag}`,
    );
  }
  for (const page of [200, 201, 202, 203]) {
    assert.ok(
      story.PAGE_REQUIREMENTS[page]?.includes("reviewedFinal"),
      `ending page ${page} should require the final broadcast`,
    );
  }
  const pageNumbers = [
    ...source.matchAll(/case (\d+):/g),
  ].map((match) => Number(match[1]));
  const queue = [
    {
      page: 100,
      flags: { ...story.INITIAL_FLAGS },
    },
  ];
  const seen = new Set();
  const reachablePages = new Set();
  const reachedEndings = new Set();
  const brokenLinks = [];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const node = queue[cursor];
    const key = `${node.page}|${flagNames
      .map((name) => (node.flags[name] ? "1" : "0"))
      .join("")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const page = story.getStoryPage(node.page, node.flags, []);
    assert.ok(page, `page ${node.page} should exist`);
    reachablePages.add(node.page);
    const activeFlags = page.visitSets
      ? { ...node.flags, ...page.visitSets }
      : node.flags;

    for (const choice of page.choices) {
      if (!story.requirementsMet(choice.requires, activeFlags)) continue;
      let nextFlags = choice.restart
        ? { ...story.INITIAL_FLAGS }
        : { ...activeFlags, ...(choice.set ?? {}) };
      const target = story.getStoryPage(choice.page, nextFlags, []);
      if (!target) {
        brokenLinks.push(`${node.page} -> ${choice.page}: ${choice.label}`);
        continue;
      }
      if (target.visitSets) {
        nextFlags = { ...nextFlags, ...target.visitSets };
      }
      if (choice.ending) reachedEndings.add(choice.ending);
      queue.push({ page: choice.page, flags: nextFlags });
    }
  }

  assert.deepEqual(brokenLinks, []);
  assert.deepEqual(
    [...reachablePages].sort((left, right) => left - right),
    [...new Set(pageNumbers)].sort((left, right) => left - right),
  );
  assert.deepEqual(
    [...reachedEndings].sort(),
    Object.keys(story.ENDING_LABELS).sort(),
  );
});
