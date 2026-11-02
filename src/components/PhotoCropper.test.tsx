import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Photo } from '@/lib/photo';
import { PhotoCropper } from './PhotoCropper';

// jsdom has no canvas: the preview isn't drawn, but framing, zoom and the result are plain state.
const photo = { width: 400, height: 300 } as Photo;

describe('framing a photo before it is uploaded', () => {
  it('starts on the centred square and hands back the zoom and position the person chose', async () => {
    const onUse = vi.fn();
    const u = userEvent.setup();
    render(<PhotoCropper photo={photo} onUse={onUse} onCancel={() => {}} />);
    const frame = screen.getByRole('button', { name: /Photo frame/ });
    frame.focus();
    await u.keyboard('{+}{+}{ArrowRight}');
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveValue('1.5');
    await u.click(screen.getByRole('button', { name: 'Use photo' }));
    const [shown, crop] = onUse.mock.calls[0];
    expect(shown).toBe(photo);
    expect(crop.zoom).toBe(1.5);
    expect(crop.cx).toBeGreaterThan(200);
    expect(crop.cy).toBe(150);
  });

  it('resets the framing, and cancel leaves without using the photo', async () => {
    const onUse = vi.fn();
    const onCancel = vi.fn();
    const u = userEvent.setup();
    render(<PhotoCropper photo={photo} onUse={onUse} onCancel={onCancel} />);
    screen.getByRole('button', { name: /Photo frame/ }).focus();
    await u.keyboard('{+}');
    await u.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveValue('1');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onUse).not.toHaveBeenCalled();
  });

  it('stops moving at the edge of the photo', async () => {
    const onUse = vi.fn();
    const u = userEvent.setup();
    render(<PhotoCropper photo={photo} onUse={onUse} onCancel={() => {}} />);
    screen.getByRole('button', { name: /Photo frame/ }).focus();
    await u.keyboard('{+}{+}{+}{+}');
    await u.keyboard('{ArrowLeft>40/}');
    await u.click(screen.getByRole('button', { name: 'Use photo' }));
    const { zoom, cx } = onUse.mock.calls[0][1];
    expect(cx).toBeCloseTo(300 / zoom / 2);
  });
});
