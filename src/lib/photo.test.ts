import { adjust, centred, cropRect, MAX_ZOOM } from './photo';

describe('the photo crop square', () => {
  it('starts as the largest centred square', () => {
    expect(cropRect(400, 300, centred(400, 300))).toEqual({ side: 300, sx: 50, sy: 0 });
  });

  it('zooming in shrinks the square about its centre, and never past the limit', () => {
    const c = adjust(400, 300, centred(400, 300), { zoom: 2 });
    expect(cropRect(400, 300, c)).toEqual({ side: 150, sx: 125, sy: 75 });
    expect(cropRect(400, 300, adjust(400, 300, c, { zoom: 99 })).side).toBe(300 / MAX_ZOOM);
    expect(cropRect(400, 300, adjust(400, 300, c, { zoom: 0.1 })).side).toBe(300);
  });

  it('moving stops at the edges of the photo', () => {
    const zoomed = adjust(400, 300, centred(400, 300), { zoom: 2 });
    const far = adjust(400, 300, zoomed, { dx: -9999, dy: 9999 });
    expect(cropRect(400, 300, far)).toEqual({ side: 150, sx: 0, sy: 150 });
  });

  it('zooming out pulls a square that hung over an edge back inside', () => {
    const zoomed = adjust(400, 300, centred(400, 300), { zoom: 4 });
    const corner = adjust(400, 300, zoomed, { dx: -9999, dy: -9999 });
    const out = adjust(400, 300, corner, { zoom: 1 });
    const r = cropRect(400, 300, out);
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.side).toBeLessThanOrEqual(400);
    expect(r.sy + r.side).toBeLessThanOrEqual(300);
  });
});
