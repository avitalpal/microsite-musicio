"use client";

import type { SettingsState } from "./types";

export function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
}: {
  open: boolean;
  settings: SettingsState;
  onChange: (settings: SettingsState) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="handdrawn w-full max-w-md bg-(--paper) p-5 text-black">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">Settings</p>
            <h2 className="mt-1 text-2xl font-semibold">Audio</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-black px-3 py-1 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Music volume</span>
              <span>{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.musicVolume}
              onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) })}
              className="w-full accent-black"
            />
          </label>

          <label className="block space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>SFX volume</span>
              <span>{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.sfxVolume}
              onChange={(event) => onChange({ ...settings, sfxVolume: Number(event.target.value) })}
              className="w-full accent-black"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold ${
                settings.musicEnabled ? "border-black bg-black text-white" : "border-black bg-white text-black"
              }`}
              onClick={() => onChange({ ...settings, musicEnabled: !settings.musicEnabled })}
            >
              {settings.musicEnabled ? "Music on" : "Music off"}
            </button>
            <button
              type="button"
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold ${
                settings.sfxEnabled ? "border-black bg-black text-white" : "border-black bg-white text-black"
              }`}
              onClick={() => onChange({ ...settings, sfxEnabled: !settings.sfxEnabled })}
            >
              {settings.sfxEnabled ? "SFX on" : "SFX off"}
            </button>
          </div>

          <p className="text-sm leading-6 text-black/70">
            Audio controls are ready for music and SFX assets.
          </p>
        </div>
      </div>
    </div>
  );
}
