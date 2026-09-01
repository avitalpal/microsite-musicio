export type Screen = "title" | "customize" | "level1" | "level2" | "level3" | "level4" | "final";
export type RunStyle = "balanced" | "sprinter" | "jumper";

export type SettingsState = {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
};

export type PlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  crouching: boolean;
  grounded: boolean;
};

export type InteractionStats = {
  pipeUses: Record<string, number>;
  blockHits: Record<string, number>;
  enemyHits: Record<string, number>;
  powerUpHits: Record<string, number>;
  deaths: number;
};

export type CameraState = {
  x: number;
  y: number;
};

export type GameState = {
  screen: Screen;
  settings: SettingsState;
  customHeadDataUrl: string | null;
  player: PlayerState;
  camera: CameraState;
  stats: InteractionStats;
};

export type Rect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
