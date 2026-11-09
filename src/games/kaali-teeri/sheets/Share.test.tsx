import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { archive } from '@/state/archive';
import { finishedDemo, renderKt } from '@/games/kaali-teeri/test/render';
import { demoGame } from '@/games/kaali-teeri/domain';
import Share from './Share';

const draw = vi.hoisted(() => vi.fn());
vi.mock('@/lib/shareImage', () => ({ drawShareCanvas: draw }));
const copy = vi.hoisted(() => vi.fn<(text: string) => Promise<boolean>>(async () => true));
vi.mock('@/hooks/useShare', () => ({
  canShareFiles: () => false,
  copySummary: copy,
  shareScores: vi.fn(),
}));

describe('the share sheet', () => {
  beforeEach(() => archive.ready);

  it('draws the Kaali Teeri card and copies the text summary', async () => {
    draw.mockResolvedValue({
      toBlob: (f: (b: Blob) => void) => f(new Blob(['x'])),
      toDataURL: () => 'data:image/png;base64,x',
    });
    const r = renderKt(<Share />, finishedDemo());
    expect(draw.mock.calls[0][0]).toMatchObject({
      title: 'Kaali Teeri',
      subtitle: '4 hands · final scores',
    });
    expect(await screen.findByRole('img', { name: 'Final scores card' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Copy text' }));
    expect(copy.mock.calls[0][0]).toMatch(/^Kaali Teeri · 4 hands · final scores\n1\. 🐯 Riya/);
    expect(r.state().toast?.msg).toBe('Summary copied');
    expect(screen.getByRole('button', { name: 'Save image' })).toBeEnabled();
  });

  it('says so when the card cannot be drawn, and still copies text', async () => {
    draw.mockRejectedValue(new Error('no canvas'));
    renderKt(<Share />, finishedDemo());
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t draw the image');
    expect(screen.getByRole('button', { name: 'Save image' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy text' })).toBeEnabled();
  });

  it('has nothing to share before the first hand is scored', () => {
    const g = demoGame();
    renderKt(<Share />, { ...g, id: 'kt3', hands: [] });
    expect(screen.getByText(/once the first hand is done/)).toBeInTheDocument();
  });
});
