import type { StoryFlags, StoryPage } from "./story";
import { requirementsMet } from "./story";

export const TELETEXT_WIDTH = 960;
export const TELETEXT_HEIGHT = 720;
export const TELETEXT_COLUMNS = 40;
export const TELETEXT_ROWS = 24;

const CELL_WIDTH = TELETEXT_WIDTH / TELETEXT_COLUMNS;
const CELL_HEIGHT = TELETEXT_HEIGHT / TELETEXT_ROWS;

const palette = {
  black: "#020308",
  red: "#ff3f54",
  green: "#65ff85",
  yellow: "#ffe36e",
  blue: "#4666ff",
  magenta: "#ff59d1",
  cyan: "#58e9ff",
  white: "#eef5e9",
  dim: "#637078",
};

export interface ChoiceRegion {
  index: number;
  top: number;
  bottom: number;
}

export interface TeletextDrawState {
  selectedChoice: number;
  hoveredChoice: number | null;
  revealed: boolean;
  hold: boolean;
  focus: boolean;
  entry: string;
  visibleRows: number;
  alert: string;
  clockSeconds: number;
  glitchSeed: number;
  reducedFlash: boolean;
}

function clear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.black;
  ctx.fillRect(0, 0, TELETEXT_WIDTH, TELETEXT_HEIGHT);
  ctx.textBaseline = "alphabetic";
  ctx.imageSmoothingEnabled = false;
}

function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  row: number,
  color: string,
  column = 0,
  fontSize = 29,
  maxColumns = TELETEXT_COLUMNS - column,
) {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px Teletext50, "Courier New", monospace`;
  const upper = text.toUpperCase().slice(0, maxColumns);

  for (let index = 0; index < upper.length; index += 1) {
    ctx.fillText(
      upper[index],
      (column + index) * CELL_WIDTH + 1,
      row * CELL_HEIGHT + CELL_HEIGHT - 4,
    );
  }
}

function fitRight(value: string, width: number) {
  if (value.length >= width) return value.slice(-width);
  return `${" ".repeat(width - value.length)}${value}`;
}

function wrapLine(line: string, width = 40) {
  if (!line) return [""];
  if (line.length <= width) return [line];

  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function fitBody(lines: string[], available: number) {
  let wrapped = lines.flatMap((line) => wrapLine(line, 40));
  if (wrapped.length <= available) return wrapped;

  const withoutEmpty = wrapped.filter((line) => line.length > 0);
  if (withoutEmpty.length <= available) return withoutEmpty;

  wrapped = withoutEmpty.slice(0, available);
  if (withoutEmpty.length > available) {
    wrapped[available - 1] = "CONTINUED ON LINKED PAGE...";
  }
  return wrapped;
}

function formatClock(seconds: number) {
  const second = Math.min(59, 4 + (seconds % 56));
  return `02:13:${second.toString().padStart(2, "0")}`;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  page: StoryPage,
  state: TeletextDrawState,
) {
  ctx.fillStyle = palette.blue;
  ctx.fillRect(0, 0, TELETEXT_WIDTH, CELL_HEIGHT);

  drawCellText(ctx, "BWT", 0, palette.white, 1, 27, 3);
  drawCellText(ctx, fitRight(`${page.page}`, 3), 0, palette.yellow, 6, 27, 3);
  drawCellText(ctx, page.section, 0, palette.white, 11, 27, 15);
  drawCellText(ctx, formatClock(state.clockSeconds), 0, palette.cyan, 29, 27, 10);

  if (state.entry) {
    ctx.fillStyle = palette.red;
    ctx.fillRect(CELL_WIDTH * 30, CELL_HEIGHT, CELL_WIDTH * 10, CELL_HEIGHT);
    drawCellText(
      ctx,
      `P${state.entry.padEnd(3, "-")}`,
      1,
      palette.white,
      32,
      27,
      7,
    );
  } else {
    drawCellText(
      ctx,
      `${state.hold ? "HOLD " : ""}${state.focus ? "SIZE" : ""}`,
      1,
      palette.yellow,
      31,
      25,
      8,
    );
  }
}

function drawChoiceRow(
  ctx: CanvasRenderingContext2D,
  page: StoryPage,
  flags: StoryFlags,
  state: TeletextDrawState,
  index: number,
  row: number,
) {
  const item = page.choices[index];
  const active =
    state.hoveredChoice === index || state.selectedChoice === index;
  const unlocked = requirementsMet(item.requires, flags);
  const color = unlocked ? palette[item.color] : palette.dim;

  if (active) {
    ctx.globalAlpha = unlocked ? 0.2 : 0.12;
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL_HEIGHT, TELETEXT_WIDTH, CELL_HEIGHT);
    ctx.globalAlpha = 1;
  }

  drawCellText(ctx, active ? ">" : " ", row, color, 2, 27, 1);

  ctx.fillStyle = color;
  ctx.fillRect(
    CELL_WIDTH,
    row * CELL_HEIGHT + 7,
    CELL_WIDTH * 1.25,
    CELL_HEIGHT - 13,
  );

  drawCellText(
    ctx,
    item.label,
    row,
    unlocked ? palette.white : palette.dim,
    4,
    27,
    27,
  );
  drawCellText(ctx, `P${item.page}`, row, color, 34, 25, 5);
}

function drawParityErrors(
  ctx: CanvasRenderingContext2D,
  seed: number,
  reducedFlash: boolean,
) {
  const count = reducedFlash ? 2 : 6;
  let value = seed * 1_103_515_245 + 12_345;

  for (let index = 0; index < count; index += 1) {
    value = (value * 1_103_515_245 + 12_345) & 0x7fffffff;
    const column = 1 + (value % 38);
    value = (value * 1_103_515_245 + 12_345) & 0x7fffffff;
    const row = 2 + (value % 15);

    ctx.globalAlpha = reducedFlash ? 0.2 : 0.46;
    ctx.fillStyle = index % 2 ? palette.magenta : palette.cyan;
    ctx.fillRect(
      column * CELL_WIDTH,
      row * CELL_HEIGHT + 4,
      CELL_WIDTH,
      CELL_HEIGHT - 8,
    );
  }

  ctx.globalAlpha = 1;
}

export function drawTeletextPage(
  canvas: HTMLCanvasElement,
  page: StoryPage,
  flags: StoryFlags,
  state: TeletextDrawState,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [] as ChoiceRegion[];

  clear(ctx);
  drawHeader(ctx, page, state);

  const choicesCount = Math.min(4, page.choices.length);
  const choiceStart = 23 - choicesCount;
  const bodyStart = 4;
  const bodyCapacity = choiceStart - bodyStart - 1;
  const sourceLines = state.revealed
    ? [...page.body, "", ...(page.hidden ?? [])]
    : page.body;
  const body = fitBody(sourceLines, bodyCapacity);

  if (state.visibleRows >= 1) {
    drawCellText(ctx, page.section, 1, palette.cyan, 1, 25, 28);
  }

  if (state.visibleRows >= 2) {
    ctx.fillStyle = palette.magenta;
    ctx.fillRect(
      CELL_WIDTH,
      CELL_HEIGHT * 2 + 3,
      CELL_WIDTH * 38,
      CELL_HEIGHT - 5,
    );
    drawCellText(ctx, page.title, 2, palette.white, 2, 29, 36);
  }

  if (state.visibleRows >= 3) {
    drawCellText(
      ctx,
      `GOAL: ${page.objective ?? "FOLLOW THE BROADCAST"}`,
      3,
      palette.yellow,
      1,
      22,
      39,
    );
  }

  body.forEach((line, index) => {
    const row = bodyStart + index;
    if (row > state.visibleRows) return;
    const isSystem =
      line.includes("MARA:") ||
      line.includes("ENDING ") ||
      line.includes("REVEAL:");
    const color = isSystem
      ? line.includes("REVEAL:")
        ? palette.magenta
        : palette.green
      : palette.white;
    drawCellText(ctx, line, row, color, 1, 27, 39);
  });

  const regions: ChoiceRegion[] = [];
  const promptRow = choiceStart - 1;
  if (promptRow <= state.visibleRows) {
    const selectedItem =
      state.selectedChoice >= 0
        ? page.choices[state.selectedChoice]
        : undefined;
    const prompt =
      selectedItem &&
      (selectedItem.kind === "decision" || selectedItem.kind === "ending")
        ? `CONFIRM ${selectedItem.label}? CHOOSE AGAIN`
        : (page.prompt ?? "CHOOSE YOUR NEXT ACTION:");
    drawCellText(
      ctx,
      prompt,
      promptRow,
      palette.cyan,
      1,
      22,
      38,
    );
  }

  for (let index = 0; index < choicesCount; index += 1) {
    const row = choiceStart + index;
    regions.push({
      index,
      top: row * CELL_HEIGHT,
      bottom: (row + 1) * CELL_HEIGHT,
    });
    if (row <= state.visibleRows) {
      drawChoiceRow(ctx, page, flags, state, index, row);
    }
  }

  ctx.fillStyle = palette.blue;
  ctx.fillRect(0, CELL_HEIGHT * 23, TELETEXT_WIDTH, CELL_HEIGHT);
  drawCellText(
    ctx,
    `P${page.page}  ${
      page.hidden?.length ? "R REVEAL  " : ""
    }N NOTES  Z SIZE`,
    23,
    palette.yellow,
    1,
    24,
    38,
  );

  if (state.alert) {
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = palette.red;
    ctx.fillRect(
      CELL_WIDTH * 2,
      CELL_HEIGHT * 15,
      CELL_WIDTH * 36,
      CELL_HEIGHT * 2,
    );
    ctx.globalAlpha = 1;
    drawCellText(ctx, state.alert, 15, palette.white, 3, 27, 34);
    drawCellText(ctx, "THE FOG WAITS.", 16, palette.white, 3, 27, 34);
  }

  if (
    !state.reducedFlash &&
    (page.effect === "mirror" ||
      page.effect === "live" ||
      page.effect === "countdown")
  ) {
    drawParityErrors(ctx, state.glitchSeed, state.reducedFlash);
  }

  return regions;
}

export function drawSearchScreen(
  canvas: HTMLCanvasElement,
  requestedPage: string,
  phase: number,
  clockSeconds: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  clear(ctx);
  ctx.fillStyle = palette.blue;
  ctx.fillRect(0, 0, TELETEXT_WIDTH, CELL_HEIGHT);
  drawCellText(ctx, "BWT", 0, palette.white, 1, 27, 3);
  drawCellText(ctx, formatClock(clockSeconds), 0, palette.cyan, 29, 27, 10);

  const digits = requestedPage.padEnd(3, "-");
  drawCellText(ctx, `P${digits}`, 8, palette.yellow, 15, 45, 8);
  drawCellText(
    ctx,
    phase % 2 ? "SEARCHING CARRIER" : "WAITING FOR PAGE",
    11,
    palette.cyan,
    10,
    30,
    22,
  );

  for (let index = 0; index < Math.min(12, phase + 2); index += 1) {
    ctx.fillStyle = [
      palette.red,
      palette.green,
      palette.yellow,
      palette.cyan,
    ][index % 4];
    ctx.fillRect(
      (8 + index * 2) * CELL_WIDTH,
      14 * CELL_HEIGHT,
      CELL_WIDTH * 1.5,
      CELL_HEIGHT * 0.55,
    );
  }
}

export function drawMissingPage(
  canvas: HTMLCanvasElement,
  requestedPage: string,
  clockSeconds: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  clear(ctx);
  ctx.fillStyle = palette.red;
  ctx.fillRect(0, 0, TELETEXT_WIDTH, CELL_HEIGHT);
  drawCellText(ctx, "BWT", 0, palette.white, 1, 27, 3);
  drawCellText(ctx, formatClock(clockSeconds), 0, palette.white, 29, 27, 10);

  drawCellText(ctx, `PAGE ${requestedPage}`, 8, palette.yellow, 13, 40, 12);
  drawCellText(ctx, "NO CARRIER FOUND", 11, palette.red, 11, 34, 19);
  drawCellText(ctx, "THE NUMBER STILL RINGS.", 14, palette.white, 8, 28, 25);
}

export function drawBootScreen(canvas: HTMLCanvasElement, phase = 0) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  clear(ctx);
  const width = Math.min(34, 4 + phase * 5);
  ctx.fillStyle = phase % 2 ? palette.cyan : palette.white;
  ctx.fillRect(
    ((TELETEXT_COLUMNS - width) / 2) * CELL_WIDTH,
    11.7 * CELL_HEIGHT,
    width * CELL_WIDTH,
    0.6 * CELL_HEIGHT,
  );

  if (phase > 2) {
    drawCellText(ctx, "BELLWETHER NIGHT SERVICE", 14, palette.cyan, 7, 30, 28);
  }
  if (phase > 4) {
    drawCellText(ctx, "ACQUIRING ROOM 214", 16, palette.yellow, 10, 28, 24);
  }
}
