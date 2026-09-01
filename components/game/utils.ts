import type { InteractionStats, Rect } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function lowerKey(key: string) {
  return key.toLowerCase();
}

export function incrementCounter(record: Record<string, number>, id: string) {
  return {
    ...record,
    [id]: (record[id] ?? 0) + 1,
  };
}

export function totalRecordCount(record: Record<string, number>) {
  return Object.values(record).reduce((sum, value) => sum + value, 0);
}

export function createEmptyStats(): InteractionStats {
  return {
    pipeUses: {},
    blockHits: {},
    enemyHits: {},
    powerUpHits: {},
    deaths: 0,
  };
}
