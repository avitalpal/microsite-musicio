import {
  DODGE_PLATFORMS,
  LEVEL2_BLOCKS,
  LEVEL2_GOAL,
  LEVEL3_BLOCKS,
  LEVEL3_ENEMY,
  LEVEL3_GOAL,
  LEVEL3_POWERUP,
  LEVEL4_FALL_Y,
  LEVEL4_GOAL,
  PIPE_STAGE,
} from "./constants";
import type { PlayerState, Rect, RunStyle, Screen } from "./types";
import { clamp, rectsOverlap } from "./utils";

export const PLAYER_WIDTH = 56;
export const STANDING_HEIGHT = 96;
export const CROUCHING_HEIGHT = 64;
export const SIDE_FLOOR_Y = 520;
export const LEVEL4_START_Y = 544;

const GRAVITY = 1900;

function movementProfile(style: RunStyle) {
  if (style === "sprinter") return { moveSpeed: 310, crouchSpeed: 190, jumpSpeed: -740 };
  if (style === "jumper") return { moveSpeed: 220, crouchSpeed: 145, jumpSpeed: -900 };
  return { moveSpeed: 250, crouchSpeed: 160, jumpSpeed: -780 };
}

type InputState = {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpQueued: boolean;
  actionQueued: boolean;
  hiddenBlocks: Record<string, boolean>;
  runStyle: RunStyle;
};

export type GameEvent =
  | { type: "pipeUse"; id: string }
  | { type: "blockHit"; id: string }
  | { type: "enemyHit"; id: string }
  | { type: "powerUpHit"; id: string }
  | { type: "platformLand"; id: string }
  | { type: "death" }
  | { type: "levelComplete"; screen: "level2" | "level3" | "level4" | "final" };

export type SimulationResult = {
  player: PlayerState;
  events: GameEvent[];
  camera: { x: number; y: number };
};

export function createPlayer(x = 90, y = SIDE_FLOOR_Y - STANDING_HEIGHT): PlayerState {
  return { x, y, vx: 0, vy: 0, facing: 1, crouching: false, grounded: true };
}

export function resetPlayer(screen: Exclude<Screen, "title" | "customize" | "final">) {
  return screen === "level4" ? createPlayer(60, LEVEL4_START_Y) : createPlayer();
}

function playerRect(player: PlayerState) {
  return {
    id: "player",
    x: player.x,
    y: player.y,
    w: PLAYER_WIDTH,
    h: player.crouching ? CROUCHING_HEIGHT : STANDING_HEIGHT,
  } satisfies Rect;
}

function horizontalOverlap(player: PlayerState, rect: Rect) {
  return player.x < rect.x + rect.w && player.x + PLAYER_WIDTH > rect.x;
}

function landOnHighestCrossedSurface(
  player: PlayerState,
  previousBottom: number,
  surfaces: Rect[],
  height: number,
) {
  if (player.vy < 0) return false;

  const crossed = surfaces.filter(
    (surface) =>
      horizontalOverlap(player, surface) &&
      previousBottom <= surface.y &&
      player.y + height >= surface.y,
  );
  if (!crossed.length) return false;

  const surface = crossed.reduce((highest, current) => (current.y < highest.y ? current : highest));
  player.y = surface.y - height;
  player.vy = 0;
  player.grounded = true;
  return true;
}

function movePlayer(player: PlayerState, dt: number, input: InputState) {
  const profile = movementProfile(input.runStyle);
  const previousY = player.y;
  const heightBeforeMove = player.crouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
  const previousBottom = player.y + heightBeforeMove;
  player.crouching = input.down && player.grounded;
  const height = player.crouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
  const speed = player.crouching ? profile.crouchSpeed : profile.moveSpeed;

  if (input.left !== input.right) {
    player.vx = input.left ? -speed : speed;
    player.facing = input.left ? -1 : 1;
  } else {
    player.vx *= player.grounded ? 0.8 : 0.96;
    if (Math.abs(player.vx) < 1) player.vx = 0;
  }

  if (input.jumpQueued && player.grounded) {
    player.vy = profile.jumpSpeed;
    player.grounded = false;
  }

  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.grounded = false;

  return { previousY, previousBottom, height };
}

function resolveFloor(player: PlayerState, previousBottom: number, height: number, floorY: number) {
  if (player.vy >= 0 && previousBottom <= floorY && player.y + height >= floorY) {
    player.y = floorY - height;
    player.vy = 0;
    player.grounded = true;
    return;
  }

  if (player.y + height > floorY && player.vy >= 0) {
    player.y = floorY - height;
    player.vy = 0;
    player.grounded = true;
  }
}

function resolveBlockInteractions(
  player: PlayerState,
  previousY: number,
  previousBottom: number,
  blocks: Rect[],
  hiddenBlocks: Record<string, boolean>,
  events: GameEvent[],
) {
  const height = player.crouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
  for (const block of blocks) {
    if (hiddenBlocks[block.id] || !horizontalOverlap(player, block)) continue;

    const hitFromBelow =
      player.vy < 0 &&
      previousY >= block.y + block.h &&
      player.y <= block.y + block.h;
    if (hitFromBelow) {
      player.y = block.y + block.h;
      player.vy = 0;
      events.push({ type: "blockHit", id: block.id });
      continue;
    }

    if (player.vy >= 0 && previousBottom <= block.y && player.y + height >= block.y) {
      player.y = block.y - height;
      player.vy = 0;
      player.grounded = true;
    }
  }
}

function sideLevel(
  screen: "level1" | "level2" | "level3",
  player: PlayerState,
  dt: number,
  input: InputState,
  hiddenBlocks: Record<string, boolean>,
): SimulationResult {
  const events: GameEvent[] = [];
  const { previousY, previousBottom, height } = movePlayer(player, dt, input);
  const maxX = screen === "level1" ? 1320 : screen === "level2" ? 1400 : 1500;
  player.x = clamp(player.x, 20, maxX);

  if (screen === "level1") {
    const pipes = PIPE_STAGE.pipes;
    landOnHighestCrossedSurface(player, previousBottom, pipes, height);
    resolveFloor(player, previousBottom, height, SIDE_FLOOR_Y);
    if (input.actionQueued && player.grounded) {
      const pipe = pipes.find(
        (candidate) => horizontalOverlap(player, candidate) && Math.abs(player.y + height - candidate.y) < 2,
      );
      if (pipe) {
        events.push({ type: "pipeUse", id: pipe.id });
        events.push({ type: "levelComplete", screen: "level2" });
      }
    }
    return { player, events, camera: { x: clamp(player.x - 180, 0, maxX - 480), y: 0 } };
  }

  const blocks = screen === "level2" ? LEVEL2_BLOCKS : LEVEL3_BLOCKS;
  const exitPipe = screen === "level2" ? LEVEL2_GOAL : LEVEL3_GOAL;
  resolveBlockInteractions(player, previousY, previousBottom, blocks, hiddenBlocks, events);
  landOnHighestCrossedSurface(player, previousBottom, [exitPipe], height);
  resolveFloor(player, previousBottom, height, SIDE_FLOOR_Y);

  if (screen === "level3") {
    if (rectsOverlap(playerRect(player), LEVEL3_ENEMY)) {
      events.push({ type: "enemyHit", id: LEVEL3_ENEMY.id });
      Object.assign(player, resetPlayer("level3"));
    } else if (rectsOverlap(playerRect(player), LEVEL3_POWERUP)) {
      events.push({ type: "powerUpHit", id: LEVEL3_POWERUP.id });
      player.vy = movementProfile(input.runStyle).jumpSpeed * 1.1;
      player.grounded = false;
    }
  }

  if (
    input.actionQueued &&
    player.grounded &&
    horizontalOverlap(player, exitPipe) &&
    Math.abs(player.y + height - exitPipe.y) < 2
  ) {
    events.push({ type: "levelComplete", screen: screen === "level2" ? "level3" : "level4" });
  }

  return { player, events, camera: { x: clamp(player.x - 180, 0, maxX - 480), y: 0 } };
}

function doodleLevel(player: PlayerState, dt: number, input: InputState): SimulationResult {
  const events: GameEvent[] = [];
  const { previousBottom, height } = movePlayer(player, dt, input);
  player.x = clamp(player.x, 20, 760);
  const platforms = DODGE_PLATFORMS.filter((platform) => !input.hiddenBlocks[platform.id]);
  if (landOnHighestCrossedSurface(player, previousBottom, platforms, height)) {
    const landed = platforms.find((platform) => Math.abs(player.y + height - platform.y) < 1);
    player.vy = movementProfile(input.runStyle).jumpSpeed;
    player.grounded = false;
    if (landed) events.push({ type: "platformLand", id: landed.id });
  }

  if (player.y > LEVEL4_FALL_Y) {
    events.push({ type: "death" });
    Object.assign(player, resetPlayer("level4"));
  }

  if (rectsOverlap(playerRect(player), LEVEL4_GOAL)) {
    events.push({ type: "levelComplete", screen: "final" });
  }

  const horizontalCamera = clamp(player.x - 210, 0, 360);
  return { player, events, camera: { x: horizontalCamera, y: clamp(player.y - 360, 0, 620) } };
}

export function simulate(
  screen: Exclude<Screen, "title" | "customize" | "final">,
  current: PlayerState,
  dt: number,
  input: InputState,
  hiddenBlocks: Record<string, boolean>,
): SimulationResult {
  const player = { ...current };
  return screen === "level4" ? doodleLevel(player, dt, input) : sideLevel(screen, player, dt, input, hiddenBlocks);
}
