/**
 * Picking a profile photo: decoded upright, framed with a square crop the person can move and zoom, then drawn
 * 256×256 as WebP (JPEG where the browser can't write WebP). The API allows 2 MB and the server re-encodes.
 */
export type Photo = ImageBitmap | HTMLCanvasElement;

/** The crop square: its centre in source pixels, and how far in it is (1 = the whole short side). */
export interface Crop {
  zoom: number;
  cx: number;
  cy: number;
}

export const MAX_ZOOM = 4;
export const OUT_SIZE = 256;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The framing a photo starts with: the largest centred square. */
export const centred = (w: number, h: number): Crop => ({ zoom: 1, cx: w / 2, cy: h / 2 });

/** The square to cut from a w×h image, kept inside the image whatever the crop says. */
export function cropRect(w: number, h: number, c: Crop) {
  const side = Math.min(w, h) / clamp(c.zoom, 1, MAX_ZOOM);
  return {
    side,
    sx: clamp(c.cx - side / 2, 0, w - side),
    sy: clamp(c.cy - side / 2, 0, h - side),
  };
}

/** A crop moved by `dx`, `dy` source pixels and/or set to a new zoom, still inside the image. */
export function adjust(
  w: number,
  h: number,
  c: Crop,
  to: { zoom?: number; dx?: number; dy?: number },
): Crop {
  const zoom = clamp(to.zoom ?? c.zoom, 1, MAX_ZOOM);
  const { side } = cropRect(w, h, { ...c, zoom });
  return {
    zoom,
    cx: clamp(c.cx + (to.dx ?? 0), side / 2, w - side / 2),
    cy: clamp(c.cy + (to.dy ?? 0), side / 2, h - side / 2),
  };
}

/** Decodes a picked file with its camera rotation applied; rejects when it isn't an image. */
export const loadPhoto = (file: Blob): Promise<ImageBitmap> =>
  createImageBitmap(file, { imageOrientation: 'from-image' });

const canvasOf = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('no canvas');
  return { c, g };
};

/** The photo turned a quarter clockwise. */
export function rotateQuarter(src: Photo): HTMLCanvasElement {
  const { c, g } = canvasOf(src.height, src.width);
  g.translate(c.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(src, 0, 0);
  return c;
}

/** Paints the crop square, scaled to fill `g`'s canvas. */
export function drawCrop(g: CanvasRenderingContext2D, src: Photo, crop: Crop, size: number) {
  const { sx, sy, side } = cropRect(src.width, src.height, crop);
  g.imageSmoothingQuality = 'high';
  g.clearRect(0, 0, size, size);
  g.drawImage(src, sx, sy, side, side, 0, 0, size, size);
}

/** The crop as the small image that is uploaded. */
export async function encodeCrop(src: Photo, crop: Crop, size = OUT_SIZE): Promise<Blob> {
  const { c, g } = canvasOf(size, size);
  drawCrop(g, src, crop, size);
  const encode = (type: string) => new Promise<Blob | null>((ok) => c.toBlob(ok, type, 0.85));
  // An unsupported type comes back as PNG, so the type is checked, not assumed.
  const webp = await encode('image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg');
  if (!jpeg) throw new Error('could not encode');
  return jpeg;
}
