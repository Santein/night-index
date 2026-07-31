import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "night-index";
const basePath = repositoryName.endsWith(".github.io")
  ? ""
  : `/${repositoryName}`;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? listFiles(path) : [path];
      }),
    )
  ).flat();
}

test("exports a repository-subpath-safe GitHub Pages build", async () => {
  const html = await readFile("out/index.html", "utf8");

  assert.match(html, new RegExp(`href="${basePath}/_next/`));
  assert.match(html, new RegExp(`src="${basePath}/_next/`));
  assert.match(
    html,
    new RegExp(`url\\("${basePath}/fonts/Teletext50\\.otf"\\)`),
  );
  assert.doesNotMatch(html, /(?:href|src)="\/_next\//);

  const chunkFiles = (await listFiles("out/_next/static/chunks")).filter(
    (file) => file.endsWith(".js"),
  );
  const chunks = (
    await Promise.all(chunkFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  assert.match(chunks, new RegExp(JSON.stringify(basePath)));
  assert.match(chunks, /Television_01_1k\.gltf/);
  assert.match(chunks, /television-vintage\.glb/);

  await Promise.all(
    [
      "out/favicon.svg",
      "out/og.png",
      "out/fonts/Teletext50.otf",
      "out/models/television/Television_01_1k.gltf",
      "out/models/television/Television_01.bin",
      "out/models/television/television-vintage.glb",
      "out/models/television/textures/Television_01_arm_1k.jpg",
      "out/models/television/textures/Television_01_diff_1k.jpg",
      "out/models/television/textures/Television_01_nor_gl_1k.jpg",
    ].map((file) => access(file)),
  );
});
