import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  adjust,
  centred,
  drawCrop,
  cropRect,
  MAX_ZOOM,
  rotateQuarter,
  type Crop,
  type Photo,
} from '@/lib/photo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { t } from '@/strings';

const x = t.hub.photo;
// The preview is drawn at twice its CSS size so it stays sharp on dense screens.
const VIEW = 560;
const KEY_STEP = 0.05;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Frames a photo before it is uploaded: drag (or arrow keys) to move, pinch or slide to zoom, turn it a quarter,
 * with a circle showing what the round avatar will keep. `onUse` gets the photo and crop the person settled on.
 */
export function PhotoCropper({
  photo,
  busy,
  onUse,
  onCancel,
}: {
  photo: Photo;
  busy?: boolean;
  onUse: (photo: Photo, crop: Crop) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState<Photo>(photo);
  const [crop, setCrop] = useState<Crop>(() => centred(photo.width, photo.height));
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<HTMLButtonElement>(null);
  // Pointers currently down, so one finger moves and two zoom.
  const down = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; zoom: number } | null>(null);

  useEffect(() => {
    const g = canvas.current?.getContext('2d');
    if (g) drawCrop(g, src, crop, VIEW);
  }, [src, crop]);

  const set = (to: { zoom?: number; dx?: number; dy?: number }) =>
    setCrop((c) => adjust(src.width, src.height, c, to));

  // Screen pixels to photo pixels at the current zoom.
  const scale = () =>
    cropRect(src.width, src.height, crop).side / (view.current?.clientWidth || VIEW);

  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (down.current.size === 2) {
      const [a, b] = [...down.current.values()];
      pinch.current = { d: dist(a, b), zoom: crop.zoom };
    }
  };
  const onMove = (e: PointerEvent) => {
    const prev = down.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    down.current.set(e.pointerId, now);
    if (down.current.size === 2 && pinch.current) {
      const [a, b] = [...down.current.values()];
      set({ zoom: pinch.current.zoom * (dist(a, b) / pinch.current.d) });
    } else if (down.current.size === 1) {
      const k = scale();
      set({ dx: -(now.x - prev.x) * k, dy: -(now.y - prev.y) * k });
    }
  };
  const onUp = (e: PointerEvent) => {
    down.current.delete(e.pointerId);
    pinch.current = null;
  };

  const onKey = (e: KeyboardEvent) => {
    const step = cropRect(src.width, src.height, crop).side * KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.key in moves) set({ dx: moves[e.key][0], dy: moves[e.key][1] });
    else if (e.key === '+' || e.key === '=') set({ zoom: crop.zoom + 0.25 });
    else if (e.key === '-') set({ zoom: crop.zoom - 0.25 });
    else return;
    e.preventDefault();
  };

  const rotate = () => {
    const next = rotateQuarter(src);
    setSrc(next);
    setCrop(centred(next.width, next.height));
  };

  return (
    <Sheet title={x.adjustTitle} onClose={onCancel}>
      <button
        ref={view}
        type="button"
        aria-label={x.frame}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative mx-auto block aspect-square w-full max-w-[20rem] touch-none select-none overflow-hidden rounded-2xl bg-ov/10"
      >
        <canvas ref={canvas} width={VIEW} height={VIEW} aria-hidden className="h-full w-full" />
        {/* The circle is what the avatar keeps; the scrim outside it is the part that is cut away. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-ov/70 shadow-[0_0_0_999px_var(--scrim)]"
        />
      </button>
      <p className="mt-2 text-center text-13 text-[var(--tx2)]">{x.hint}</p>
      <label className="mt-3 flex items-center gap-3 text-15 font-bold">
        {x.zoom}
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => set({ zoom: Number(e.target.value) })}
          className="h-11 min-w-0 flex-1 accent-[var(--accent)]"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={rotate}
          className="press glass min-h-11 rounded-xl px-4 text-14 font-bold"
        >
          {x.rotate}
        </button>
        <button
          type="button"
          onClick={() => setCrop(centred(src.width, src.height))}
          className="press min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent-tx)]"
        >
          {x.reset}
        </button>
      </div>
      <div className="mt-4 flex gap-3">
        <PrimaryButton type="button" tone="glass" className="flex-1" onClick={onCancel}>
          {t.common.cancel}
        </PrimaryButton>
        <PrimaryButton
          type="button"
          className="flex-1"
          disabled={busy}
          onClick={() => onUse(src, crop)}
        >
          {busy ? x.busy : x.use}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
