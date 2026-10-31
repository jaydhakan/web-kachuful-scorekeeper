/**
 * A picked photo made small on the phone before upload (HANDOFF §5.7 allows 2 MB; the server re-encodes anyway):
 * rotated upright, the centre square, 256×256, as WebP, or JPEG where the browser can't write WebP.
 */
export async function squarePhoto(file: Blob, size = 256): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('no canvas');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  const encode = (type: string) => new Promise<Blob | null>((ok) => c.toBlob(ok, type, 0.85));
  // An unsupported type comes back as PNG, so the type is checked, not assumed.
  const webp = await encode('image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg');
  if (!jpeg) throw new Error('could not encode');
  return jpeg;
}
