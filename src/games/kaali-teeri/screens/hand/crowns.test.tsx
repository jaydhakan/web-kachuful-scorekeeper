import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CrownsValue, NO_CROWNS } from '@/components/crowns/table';
import { KtProvider } from '@/games/kaali-teeri/state/store';
import type { KtState } from '@/games/kaali-teeri/state/types';
import Summary from './Summary';
import { game } from './testkit';

// Riya (seat 1) bids every hand; she is the month's Badshah here.
const mount = (s: KtState) => {
  const id = s.game!.players[1].id;
  const crowns = {
    ...NO_CROWNS,
    held: new Map([[id, { medal: 1 as const, defending: false }]]),
    after: new Map([[id, { medal: 1 as const, defending: false }]]),
    marks: new Map([[id, 'gold' as const]]),
  };
  return render(
    <KtProvider
      initial={{ game: s.game, screen: 'game', undo: [], prefs: s.prefs, corrupt: false }}
    >
      <CrownsValue value={crowns}>
        <Summary />
      </CrownsValue>
    </KtProvider>,
  );
};

describe('Kaali Teeri crowns on the summary', () => {
  it('names the Badshah in gold and teases a failed bid', () => {
    mount(game(5, 1, undefined, 200));
    expect(document.querySelector('[data-banter]')?.textContent).toBeTruthy();
    expect(screen.getAllByText(/🥇/).length).toBeGreaterThan(0);
  });

  it('says nothing when nobody at the table holds a mark', () => {
    render(
      <KtProvider
        initial={{
          game: game(5, 1, undefined, 200).game,
          screen: 'game',
          undo: [],
          prefs: game(5, 1).prefs,
          corrupt: false,
        }}
      >
        <Summary />
      </KtProvider>,
    );
    expect(document.querySelector('[data-banter]')).toBeNull();
  });
});
