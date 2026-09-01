import type { Rect } from "./types";

export const TITLE_COPY = {
  heading: "Stick Figure Journey",
  body: "Draw your head. Pick your edge. Make it to the top.",
};

export const PIPE_STAGE = {
  pipes: [
    { id: "pipe-1", x: 210, y: 400, w: 118, h: 120 },
    { id: "pipe-2", x: 650, y: 370, w: 118, h: 150 },
    { id: "pipe-3", x: 1090, y: 420, w: 118, h: 100 },
  ] satisfies Rect[],
};

export const LEVEL2_BLOCKS = [
  { id: "block-2-1", x: 260, y: 370, w: 112, h: 24 },
  { id: "block-2-2", x: 430, y: 310, w: 112, h: 24 },
  { id: "block-2-3", x: 610, y: 370, w: 112, h: 24 },
  { id: "block-2-4", x: 790, y: 310, w: 112, h: 24 },
] satisfies Rect[];

export const LEVEL2_GOAL = { id: "goal-2", x: 1020, y: 400, w: 118, h: 120 } satisfies Rect;

export const LEVEL3_BLOCKS = [
  { id: "block-3-1", x: 250, y: 370, w: 112, h: 24 },
  { id: "block-3-2", x: 430, y: 310, w: 112, h: 24 },
  { id: "block-3-3", x: 620, y: 260, w: 112, h: 24 },
  { id: "block-3-4", x: 810, y: 310, w: 112, h: 24 },
] satisfies Rect[];

export const LEVEL3_ENEMY = { id: "enemy-3-1", x: 930, y: 310, w: 46, h: 46 } satisfies Rect;

export const LEVEL3_POWERUP = { id: "powerup-3-1", x: 1110, y: 140, w: 34, h: 34 } satisfies Rect;

export const LEVEL3_GOAL = { id: "goal-3", x: 1260, y: 400, w: 118, h: 120 } satisfies Rect;

export const DODGE_PLATFORMS = [
  { id: "plat-4-1", x: 20, y: 640, w: 190, h: 18 },
  { id: "plat-4-2", x: 230, y: 560, w: 140, h: 18 },
  { id: "plat-4-3", x: 410, y: 480, w: 140, h: 18 },
  { id: "plat-4-4", x: 590, y: 400, w: 140, h: 18 },
  { id: "plat-4-5", x: 330, y: 320, w: 150, h: 18 },
  { id: "plat-4-6", x: 120, y: 240, w: 140, h: 18 },
  { id: "plat-4-7", x: 360, y: 160, w: 160, h: 18 },
  { id: "plat-4-8", x: 560, y: 80, w: 150, h: 18 },
] satisfies Rect[];

export const LEVEL4_GOAL = { id: "goal-4", x: 620, y: 20, w: 60, h: 60 } satisfies Rect;
export const LEVEL4_FALL_Y = 980;

export const LEVEL_DESCRIPTIONS = {
  level1: "Stand on the pipe and press E to move on.",
  level2: "Hit the low blocks, then stand on the exit pipe and press E.",
  level3: "Use the power-up, dodge the enemy, then press E at the exit pipe.",
  level4: "Keep bouncing across disappearing platforms to reach the top.",
};
