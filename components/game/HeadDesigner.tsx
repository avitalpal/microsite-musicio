"use client";

import { useEffect, useRef, useState } from "react";
import { StickFigure } from "./StickFigure";
import type { RunStyle } from "./types";

export function HeadDesigner({ onComplete }: { onComplete: (dataUrl: string, runStyle: RunStyle) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintingRef = useRef(false);
  const colorRef = useRef("#d1d5db");
  const [color, setColor] = useState("#d1d5db");
  const [locked, setLocked] = useState(false);
  const [runStyle, setRunStyle] = useState<RunStyle>("balanced");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const drawBase = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 96, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "black";
      ctx.stroke();
    };

    drawBase();
    setPreviewDataUrl(canvas.toDataURL("image/png"));

    const paint = (clientX: number, clientY: number) => {
      if (locked) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const center = size / 2;
      const distance = Math.hypot(x - center, y - center);
      if (distance > 96) return;

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, 96, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = colorRef.current;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      setPreviewDataUrl(canvas.toDataURL("image/png"));
    };

    const onDown = (event: PointerEvent) => {
      paintingRef.current = true;
      paint(event.clientX, event.clientY);
    };
    const onMove = (event: PointerEvent) => {
      if (!paintingRef.current) return;
      paint(event.clientX, event.clientY);
    };
    const onUp = () => {
      paintingRef.current = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [locked]);

  const reset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 280;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 96, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "black";
    ctx.stroke();
    setLocked(false);
    setPreviewDataUrl(canvas.toDataURL("image/png"));
  };

  const complete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLocked(true);
    setPreviewDataUrl(canvas.toDataURL("image/png"));
    onComplete(canvas.toDataURL("image/png"), runStyle);
  };

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="handdrawn bg-(--paper) p-4 text-black">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">Face design</p>
            <h2 className="mt-1 text-2xl font-semibold">Colour the head only</h2>
          </div>
          <span className="rounded-full border-2 border-black px-3 py-1 text-xs font-semibold">Locked later</span>
        </div>

        <div className="mt-4 rounded-3xl border-2 border-black bg-white p-3">
          <canvas ref={canvasRef} className="mx-auto block touch-none rounded-full bg-white" aria-label="Head colouring canvas" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-semibold">
            Head color
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-8 w-10 cursor-pointer bg-transparent p-0"
              aria-label="Choose head color"
            />
          </label>

          <button type="button" className="rounded-full border-2 border-black px-4 py-2 text-sm font-semibold" onClick={reset}>
            Reset
          </button>
          <button type="button" className="rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white" onClick={complete}>
            Lock head and start
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-black/70">
          Face color is painted directly onto the head.
        </p>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">Choose your run style</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ["balanced", "Balanced", "Even speed and jump"],
              ["sprinter", "Sprinter", "Fast ground movement"],
              ["jumper", "Jumper", "Higher jumps"],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                aria-pressed={runStyle === value}
                onClick={() => setRunStyle(value)}
                className={`rounded-2xl border-2 p-3 text-left text-sm ${runStyle === value ? "border-black bg-black text-white" : "border-black bg-white text-black"}`}
              >
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-xs opacity-70">{description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="handdrawn rotate-1 bg-(--teal) p-4 text-black">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60">Preview</p>
        <div className="mt-4 rounded-3xl border-2 border-black bg-white p-3">
          <div className="mx-auto w-full max-w-xs">
            <StickFigure headDataUrl={previewDataUrl} facing={1} crouching={false} />
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm leading-6 text-black/70">
          <p>Only the head is editable.</p>
          <p>Once locked, it stays fixed on the stick figure.</p>
          <p>Pick a style and leave your mark.</p>
        </div>
      </section>
    </div>
  );
}
