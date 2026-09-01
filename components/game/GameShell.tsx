"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeadDesigner } from "./HeadDesigner";
import {
  DODGE_PLATFORMS,
  LEVEL2_BLOCKS,
  LEVEL2_GOAL,
  LEVEL3_BLOCKS,
  LEVEL3_ENEMY,
  LEVEL3_GOAL,
  LEVEL3_POWERUP,
  LEVEL4_GOAL,
  LEVEL4_FALL_Y,
  LEVEL_DESCRIPTIONS,
  PIPE_STAGE,
  TITLE_COPY,
} from "./constants";

import { SettingsPanel } from "./SettingsPanel";
import { StickFigure } from "./StickFigure";
import { createPlayer, simulate, SIDE_FLOOR_Y, PLAYER_WIDTH, STANDING_HEIGHT, CROUCHING_HEIGHT } from "./engine";
import type { PlayerState, RunStyle, Screen, SettingsState } from "./types";
import { createEmptyStats, incrementCounter, lowerKey, totalRecordCount } from "./utils";

const settingsDefault: SettingsState = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
};

function isGameplayScreen(screen: Screen) {
  return screen === "level1" || screen === "level2" || screen === "level3" || screen === "level4";
}

function listRecords(record: Record<string, number>) {
  return Object.entries(record).sort((a, b) => a[0].localeCompare(b[0]));
}

function useGameController() {
  const [screen, setScreen] = useState<Screen>("title");
  const [settings, setSettings] = useState<SettingsState>(settingsDefault);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customHeadDataUrl, setCustomHeadDataUrl] = useState<string | null>(null);
  const [runStyle, setRunStyle] = useState<RunStyle>("balanced");
  const [player, setPlayer] = useState<PlayerState>(() => createPlayer());
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState(createEmptyStats);
  const [hiddenBlocks, setHiddenBlocks] = useState<Record<string, boolean>>({});

  const keysRef = useRef(new Set<string>());
  const jumpQueuedRef = useRef(false);
  const actionQueuedRef = useRef(false);
  const blockRemovalTimersRef = useRef<Record<string, number>>({});
  const playerRef = useRef(player);
  const hiddenBlocksRef = useRef(hiddenBlocks);

  useEffect(() => {
    hiddenBlocksRef.current = hiddenBlocks;
  }, [hiddenBlocks]);

  const clearBlockTimers = useCallback(() => {
    Object.values(blockRemovalTimersRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    blockRemovalTimersRef.current = {};
  }, []);

  const setControl = useCallback((key: string, pressed: boolean) => {
    if (pressed) keysRef.current.add(key);
    else keysRef.current.delete(key);
  }, []);

  const queueAction = useCallback(() => {
    actionQueuedRef.current = true;
  }, []);

  const queueJump = useCallback(() => {
    jumpQueuedRef.current = true;
  }, []);

  const resetRun = (nextScreen: Screen = "title") => {
    setScreen(nextScreen);
    setSettings(settingsDefault);
    setCustomHeadDataUrl(null);
    setPlayer(createPlayer());
    setCamera({ x: 0, y: 0 });
    setStats(createEmptyStats());
    setHiddenBlocks({});
    clearBlockTimers();
  };

  const startLevel = useCallback((nextScreen: Exclude<Screen, "title" | "customize" | "final">) => {
    const nextPlayer = createPlayer(nextScreen === "level4" ? 60 : 90, nextScreen === "level4" ? 544 : SIDE_FLOOR_Y - STANDING_HEIGHT);
    playerRef.current = nextPlayer;
    setPlayer(nextPlayer);
    setCamera({ x: 0, y: 0 });
    setHiddenBlocks({});
    clearBlockTimers();
    setScreen(nextScreen);
  }, [clearBlockTimers]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = lowerKey(event.key);
      keysRef.current.add(key);

      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "space"].includes(key)) {
        event.preventDefault();
      }

      if (key === "w" || key === "arrowup" || key === " ") {
        jumpQueuedRef.current = true;
      }

      if (key === "e") {
        actionQueuedRef.current = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(lowerKey(event.key));
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearBlockTimers();
    };
  }, [clearBlockTimers]);

  useEffect(() => {
    if (!isGameplayScreen(screen)) return;

    let raf = 0;
    let lastTime = performance.now();

    const step = (timestamp: number) => {
      const dt = Math.min(0.032, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      const input = {
        left: keysRef.current.has("a") || keysRef.current.has("arrowleft"),
        right: keysRef.current.has("d") || keysRef.current.has("arrowright"),
        down: keysRef.current.has("s") || keysRef.current.has("arrowdown"),
        jumpQueued: jumpQueuedRef.current,
        actionQueued: actionQueuedRef.current,
        hiddenBlocks: hiddenBlocksRef.current,
        runStyle,
      };
      jumpQueuedRef.current = false;
      actionQueuedRef.current = false;

      const result = simulate(screen, playerRef.current, dt, input, hiddenBlocksRef.current);
      playerRef.current = result.player;
      setPlayer(result.player);
      setCamera(result.camera);

      for (const event of result.events) {
        if (event.type === "pipeUse") {
          setStats((current) => ({ ...current, pipeUses: incrementCounter(current.pipeUses, event.id) }));
        } else if (event.type === "blockHit") {
          setStats((current) => ({ ...current, blockHits: incrementCounter(current.blockHits, event.id) }));
          if (!blockRemovalTimersRef.current[event.id]) {
            blockRemovalTimersRef.current[event.id] = window.setTimeout(() => {
              setHiddenBlocks((current) => ({ ...current, [event.id]: true }));
              delete blockRemovalTimersRef.current[event.id];
            }, 500);
          }
        } else if (event.type === "enemyHit") {
          setStats((current) => ({ ...current, enemyHits: incrementCounter(current.enemyHits, event.id) }));
          setHiddenBlocks({});
        } else if (event.type === "powerUpHit") {
          setStats((current) => ({ ...current, powerUpHits: incrementCounter(current.powerUpHits, event.id) }));
        } else if (event.type === "death") {
          setStats((current) => ({ ...current, deaths: current.deaths + 1 }));
          clearBlockTimers();
          setHiddenBlocks({});
        } else if (event.type === "platformLand") {
          if (!blockRemovalTimersRef.current[event.id]) {
            blockRemovalTimersRef.current[event.id] = window.setTimeout(() => {
              setHiddenBlocks((current) => ({ ...current, [event.id]: true }));
              delete blockRemovalTimersRef.current[event.id];
            }, 450);
          }
        } else if (event.type === "levelComplete") {
          if (event.screen === "final") setScreen("final");
          else startLevel(event.screen);
        }
      }

      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [runStyle, screen, startLevel]);

  return {
    screen,
    setScreen,
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    customHeadDataUrl,
    setCustomHeadDataUrl,
    runStyle,
    setRunStyle,
    player,
    camera,
    stats,
    hiddenBlocks,
    resetRun,
    startLevel,
    setControl,
    queueAction,
    queueJump,
  };
}

function StatList({ title, data }: { title: string; data: Record<string, number> }) {
  const items = listRecords(data);
  return (
    <div className="handdrawn-soft bg-(--paper) p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map(([id, count]) => (
            <li key={id} className="flex items-center justify-between gap-4">
              <span>{id}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-black/60">None yet</p>
      )}
    </div>
  );
}

function GameViewport({
  screen,
  player,
  camera,
  headDataUrl,
  hiddenBlocks,
  setControl,
  queueAction,
  queueJump,
}: {
  screen: Screen;
  player: PlayerState;
  camera: { x: number; y: number };
  headDataUrl: string | null;
  hiddenBlocks: Record<string, boolean>;
  setControl: (key: string, pressed: boolean) => void;
  queueAction: () => void;
  queueJump: () => void;
}) {
  const playerHeight = player.crouching ? CROUCHING_HEIGHT : STANDING_HEIGHT;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [worldScale, setWorldScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setWorldScale(Math.min(1, viewport.clientWidth / 420));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewportRef}
      className="relative w-full overflow-hidden rounded-4xl border-2 border-black bg-white"
      style={{ aspectRatio: "3 / 4", maxHeight: "70vh", maxWidth: "420px" }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: 420, height: 560, transform: `scale(${worldScale})` }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.08),transparent_45%)]" />

      {screen === "level1" && (
        <>
          {PIPE_STAGE.pipes.map((pipe) => (
            <div key={pipe.id}>
              <div className="handdrawn-soft absolute bg-(--teal)" style={{ left: pipe.x - camera.x, top: pipe.y, width: pipe.w, height: pipe.h }} />
              <div className="handdrawn-soft absolute bg-(--paper) px-2 py-1 text-[10px] font-bold" style={{ left: pipe.x - camera.x - 8, top: pipe.y - 26 }}>
                Press E here
              </div>
            </div>
          ))}
          <div className="absolute left-0 right-0 border-t-2 border-black" style={{ top: SIDE_FLOOR_Y }} />
        </>
      )}

      {screen === "level2" && (
        <>
          {LEVEL2_BLOCKS.map((block) => (
            <div
              key={block.id}
              className={`handdrawn-soft absolute bg-(--yellow) ${hiddenBlocks[block.id] ? "hidden" : ""}`}
              style={{ left: block.x - camera.x, top: block.y, width: block.w, height: block.h }}
            />
          ))}
          <div
            className="handdrawn-soft absolute rounded-t-3xl bg-(--teal) px-2 py-1 text-[10px] font-bold"
            style={{ left: LEVEL2_GOAL.x - camera.x, top: LEVEL2_GOAL.y - 24 }}
          >
                Press E to enter
          </div>
          <div className="absolute left-0 right-0 border-t-2 border-black" style={{ top: SIDE_FLOOR_Y }} />
        </>
      )}

      {screen === "level3" && (
        <>
          {LEVEL3_BLOCKS.map((block) => (
            <div
              key={block.id}
              className={`handdrawn-soft absolute bg-(--yellow) ${hiddenBlocks[block.id] ? "hidden" : ""}`}
              style={{ left: block.x - camera.x, top: block.y, width: block.w, height: block.h }}
            />
          ))}
          <div
            className="absolute rounded-full border-2 border-black bg-white"
            style={{
              left: LEVEL3_ENEMY.x - camera.x,
              top: LEVEL3_ENEMY.y,
              width: LEVEL3_ENEMY.w,
              height: LEVEL3_ENEMY.h,
            }}
            title="Placeholder enemy"
          />
          <div
            className="handdrawn-soft absolute rounded-full bg-(--paper) px-2 py-1 text-[10px] font-bold"
            style={{ left: LEVEL3_POWERUP.x - camera.x - 8, top: LEVEL3_POWERUP.y - 26 }}
          >
            Power-up
          </div>
          <div
            className="handdrawn-soft absolute rounded-t-3xl bg-(--teal) px-2 py-1 text-[10px] font-bold"
            style={{ left: LEVEL3_GOAL.x - camera.x, top: LEVEL3_GOAL.y - 24 }}
          >
            Press E to enter
          </div>
          <div className="absolute left-3 top-3 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-semibold">
            Enemy and power-up test zone
          </div>
          <div className="absolute left-0 right-0 border-t-2 border-black" style={{ top: SIDE_FLOOR_Y }} />
        </>
      )}

      {screen === "level4" && (
        <>
          {DODGE_PLATFORMS.map((platform) => (
            <div key={platform.id} className={`handdrawn-soft absolute rounded-full bg-(--yellow) ${hiddenBlocks[platform.id] ? "hidden" : ""}`} style={{ left: platform.x - camera.x, top: platform.y - camera.y, width: platform.w, height: platform.h }} />
          ))}
          <div className="absolute border-2 border-black bg-white px-2 py-1 text-[10px] font-semibold" style={{ left: LEVEL4_GOAL.x - camera.x, top: LEVEL4_GOAL.y - camera.y - 24 }}>
            Exit
          </div>
          <div className="absolute left-3 top-3 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-semibold">
            Reach the exit without falling.
          </div>
          <div className="absolute left-0 right-0 border-t-2 border-black" style={{ top: LEVEL4_FALL_Y - camera.y }} />
        </>
      )}

      <div
        className="absolute"
        style={{
          transform: `translate(${player.x - camera.x}px, ${player.y - camera.y}px)`,
          width: PLAYER_WIDTH,
          height: playerHeight,
        }}
      >
        <StickFigure headDataUrl={headDataUrl} facing={player.facing} crouching={player.crouching} />
      </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t-2 border-black bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/60">
        {LEVEL_DESCRIPTIONS[screen as keyof typeof LEVEL_DESCRIPTIONS] ?? ""}
      </div>

      <div className="absolute bottom-12 left-3 right-3 flex items-end justify-between gap-3 md:hidden" onContextMenu={(event) => event.preventDefault()}>
        <div className="grid grid-cols-3 gap-2">
          <span />
          <button type="button" aria-label="Move up" className="h-11 w-11 rounded-full border-2 border-black bg-white text-lg font-bold" onPointerDown={() => queueJump()}>
            ^
          </button>
          <span />
          <button type="button" aria-label="Move left" className="h-11 w-11 rounded-full border-2 border-black bg-white text-lg font-bold" onPointerDown={() => setControl("arrowleft", true)} onPointerUp={() => setControl("arrowleft", false)} onPointerLeave={() => setControl("arrowleft", false)}>
            &lt;
          </button>
          <button type="button" aria-label="Move down" className="h-11 w-11 rounded-full border-2 border-black bg-white text-lg font-bold" onPointerDown={() => setControl("arrowdown", true)} onPointerUp={() => setControl("arrowdown", false)} onPointerLeave={() => setControl("arrowdown", false)}>
            v
          </button>
          <button type="button" aria-label="Move right" className="h-11 w-11 rounded-full border-2 border-black bg-white text-lg font-bold" onPointerDown={() => setControl("arrowright", true)} onPointerUp={() => setControl("arrowright", false)} onPointerLeave={() => setControl("arrowright", false)}>
            &gt;
          </button>
        </div>
        <button type="button" aria-label="Enter pipe" className="h-14 w-14 rounded-full border-2 border-black bg-black text-sm font-bold text-white" onPointerDown={() => queueAction()}>
          E
        </button>
      </div>
    </div>
  );
}

export function GameShell() {
  const {
    screen,
    setScreen,
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    customHeadDataUrl,
    setCustomHeadDataUrl,
    runStyle,
    setRunStyle,
    player,
    camera,
    hiddenBlocks,
    resetRun,
    startLevel,
    stats,
    setControl,
    queueAction,
    queueJump,
  } = useGameController();
  const summary = useMemo(
    () => ({
      pipeUses: totalRecordCount(stats.pipeUses),
      blockHits: totalRecordCount(stats.blockHits),
      enemyHits: totalRecordCount(stats.enemyHits),
      powerUpHits: totalRecordCount(stats.powerUpHits),
      deaths: stats.deaths,
    }),
    [stats],
  );

  return (
    <main className="game-ink min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="handdrawn flex items-center justify-between bg-(--paper) p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/55">An ink-and-paper adventure</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{TITLE_COPY.heading}</h1>
          </div>
          <button type="button" className="handdrawn-soft bg-(--yellow) px-4 py-2 text-sm font-bold" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </header>

        {screen === "title" && (
          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="handdrawn bg-(--paper) p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/55">Ready?</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">Make a mark.</h2>
              <p className="mt-3 text-sm leading-6 text-black/75">{TITLE_COPY.body}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="handdrawn bg-(--coral) px-5 py-3 text-sm font-black"
                  onClick={() => setScreen(customHeadDataUrl ? "level1" : "customize")}
                >
                  {customHeadDataUrl ? "Continue" : "Start"}
                </button>
                {customHeadDataUrl && (
                  <button
                    type="button"
                    className="handdrawn-soft bg-(--teal) px-5 py-3 text-sm font-bold"
                    onClick={() => setScreen("customize")}
                  >
                    Repaint head
                  </button>
                )}
              </div>
            </div>

            <div className="handdrawn rotate-1 bg-(--teal) p-4">
              <div className="mx-auto w-full max-w-xs">
                <StickFigure headDataUrl={customHeadDataUrl} facing={1} crouching={false} />
              </div>
              <div className="handdrawn-soft mt-3 bg-(--paper) p-3 text-sm font-bold leading-6">Your mark goes here.</div>
            </div>
          </section>
        )}

        {screen === "customize" && (
          <section className="handdrawn bg-(--paper) p-4">
            <HeadDesigner
              onComplete={(dataUrl, selectedRunStyle) => {
                setCustomHeadDataUrl(dataUrl);
                setRunStyle(selectedRunStyle);
                startLevel("level1");
              }}
            />
          </section>
        )}

        {isGameplayScreen(screen) && (
          <section className="handdrawn bg-(--paper) p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">{screen.toUpperCase()}</p>
                <h2 className="mt-1 text-2xl font-semibold">{LEVEL_DESCRIPTIONS[screen]}</h2>
              </div>
              <div className="handdrawn-soft bg-(--yellow) px-3 py-1 text-sm font-bold">
                {screen === "level1" ? "Press E over any pipe" : screen === "level4" ? "Keep bouncing to the top" : "Press E at the exit pipe"}
              </div>
            </div>

            <GameViewport screen={screen} player={player} camera={camera} headDataUrl={customHeadDataUrl} hiddenBlocks={hiddenBlocks} setControl={setControl} queueAction={queueAction} queueJump={queueJump} />

          </section>
        )}

        {screen === "final" && (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="handdrawn bg-(--coral) p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em]">Journey complete</p>
              <h2 className="mt-2 text-3xl font-black">Nice work.</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="handdrawn-soft bg-(--paper) px-5 py-3 text-sm font-bold" onClick={() => startLevel("level1")}>
                  Replay
                </button>
                <button type="button" className="handdrawn-soft bg-(--yellow) px-5 py-3 text-sm font-bold" onClick={() => resetRun("title")}>
                  Back to title
                </button>
              </div>
            </div>

            <div className="handdrawn space-y-3 bg-(--paper) p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/60">Run marks</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="handdrawn-soft bg-(--teal) p-3 text-sm">
                  <div className="text-black/60">Pipe uses</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.pipeUses}</div>
                </div>
                <div className="handdrawn-soft bg-(--yellow) p-3 text-sm">
                  <div className="text-black/60">Block hits</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.blockHits}</div>
                </div>
                <div className="handdrawn-soft bg-(--coral) p-3 text-sm">
                  <div className="text-black/60">Enemy hits</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.enemyHits}</div>
                </div>
                <div className="handdrawn-soft bg-(--teal) p-3 text-sm">
                  <div className="text-black/60">Power-ups hit</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.powerUpHits}</div>
                </div>
                <div className="handdrawn-soft bg-(--yellow) p-3 text-sm sm:col-span-2">
                  <div className="text-black/60">Deaths in doodle-jump phase</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.deaths}</div>
                </div>
              </div>

              <StatList title="Pipe usage by id" data={stats.pipeUses} />
              <StatList title="Block hits by id" data={stats.blockHits} />
              <StatList title="Enemy hits by id" data={stats.enemyHits} />
              <StatList title="Power-up hits by id" data={stats.powerUpHits} />
            </div>
          </section>
        )}
      </div>

      <SettingsPanel open={settingsOpen} settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
