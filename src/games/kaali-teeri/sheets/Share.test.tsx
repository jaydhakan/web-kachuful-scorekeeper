import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { archive } from '@/state/archive';
import { resetSessionForTests, setSession } from '@/sync/session';
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

  describe('live and recap links', () => {
    const session = {
      user: { id: 'u1', email: 'a@b.c', role: 'member' as const, playerId: null },
      player: null,
    };
    beforeEach(() => {
      resetSessionForTests();
      setSession(null);
      draw.mockResolvedValue({ toBlob: () => {}, toDataURL: () => '' });
    });
    afterEach(() => {
      setSession(null);
      vi.unstubAllGlobals();
    });

    it('asks to sign in when signed out, and makes no request', () => {
      const f = vi.fn();
      vi.stubGlobal('fetch', f);
      renderKt(<Share />, finishedDemo());
      expect(screen.getByText('Sign in to share live and recap links.')).toBeInTheDocument();
      expect(f).not.toHaveBeenCalled();
    });

    it('waits for the game to sync before offering links', () => {
      setSession(session);
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('{}', { status: 503 })),
      );
      renderKt(<Share />, finishedDemo());
      expect(screen.getByText('Links work once the game has synced.')).toBeInTheDocument();
    });

    it('makes a live link with its QR code, and turns it off', async () => {
      setSession(session);
      const g = finishedDemo();
      archive.put('ktGames', {
        syncId: g.syncId,
        game: g,
        updatedAt: g.updatedAt,
        endedAt: g.updatedAt,
        origin: 'local',
        account: 'u1',
        syncedRev: g.rev,
      });
      const sent: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          sent.push(`${init.method} ${url}`);
          if (url.endsWith('/links'))
            return new Response(
              JSON.stringify({
                token: 'T',
                url: 'https://play.vectanix.com/l/T',
                qrSvgUrl: '/api/q.svg',
                reactions: true,
                membersOnly: false,
                expiresAt: null,
              }),
              { status: 201 },
            );
          if (init.method === 'DELETE') return new Response(null, { status: 204 });
          return new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 });
        }),
      );
      const r = renderKt(<Share />, g);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Make link: Live link' }));
      expect(
        await screen.findByRole('img', { name: 'QR code for the live link' }),
      ).toBeInTheDocument();
      expect(screen.getByText(location.origin + '/l/T')).toBeInTheDocument();
      expect(sent).toContain(`POST /api/games/${g.syncId}/links`);
      expect(screen.getByRole('switch', { name: /Spectator reactions/ })).toBeChecked();
      await user.click(screen.getByRole('button', { name: 'Turn off the live link' }));
      expect(sent).toContain(`DELETE /api/games/${g.syncId}/links/live`);
      expect(r.state().toast?.msg).toBe('Link turned off');
      expect(screen.getByRole('button', { name: 'Make link: Live link' })).toBeInTheDocument();
    });
  });
});
