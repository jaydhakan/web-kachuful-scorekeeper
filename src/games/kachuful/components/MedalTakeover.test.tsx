import { act, render, screen, waitFor } from '@testing-library/react';
import {
  CROWN_SHOWS_A_NIGHT,
  forgetMoments,
  MomentQueue,
  MomentsProvider,
  resetCrownShows,
  takeCrownShow,
} from '@/fx/moments';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { MedalsValue, NO_MEDALS, type TableMedals } from '@/games/kachuful/state/medals';
import { forgetHeard } from '@/games/kachuful/sound/once';
import { useMedalBeat, useMedalTakeover } from './MedalTakeover';

const playCue = vi.hoisted(() => vi.fn());
vi.mock('@/fx/feedback', async (orig) => ({
  ...(await orig<typeof import('@/fx/feedback')>()),
  playCue,
}));

const g = kitGame({ id: 'tk', players: ['R', 'D'], rounds: [{ made: [true, false] }], start: 0 });

const base: TableMedals = NO_MEDALS;

function Host({ fresh = true }: { fresh?: boolean }) {
  const { node, line } = useMedalTakeover(g, fresh, 0);
  const beat = useMedalBeat({ key: `beat:${fresh}`, fresh, afterMs: 0 });
  return (
    <>
      {node}
      <p data-testid="beat">{beat}</p>
      <p data-testid="line">{line}</p>
    </>
  );
}

const sounds: string[] = [];
const show = (value: TableMedals, fresh = true) => {
  const q = new MomentQueue({ playSound: (n) => sounds.push(n), vibrate: () => undefined });
  render(
    <MomentsProvider queue={q}>
      <MedalsValue value={value}>
        <Host fresh={fresh} />
      </MedalsValue>
    </MomentsProvider>,
  );
  return q;
};

describe('the medals at the end of a game', () => {
  beforeEach(() => {
    forgetMoments();
    resetCrownShows();
    forgetHeard();
    playCue.mockClear();
    sounds.length = 0;
  });

  it('plays "Naya Badshah" when gold changes hands, and a tap skips it', async () => {
    const q = show({
      ...base,
      changes: [
        { playerId: 'D', from: 2, to: 1, name: 'Dev' },
        { playerId: 'R', from: 1, to: 2, name: 'Riya' },
        { playerId: 'K', from: null, to: 3, name: 'Kabir' },
      ],
    });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Naya Badshah: Dev!'));
    expect(screen.getByRole('alert')).toHaveTextContent('Riya was Badshah');
    // The old Badshah's own drop is said once, by "was Badshah"; others who moved are listed.
    expect(screen.getByRole('alert')).not.toHaveTextContent('Riya is the new Wazir');
    expect(screen.getByRole('alert')).toHaveTextContent('🥉 Kabir is the new Senapati');
    expect(screen.getByTestId('beat')).toBeEmptyDOMElement();
    expect(sounds).toEqual(['shehnai']);
    act(() => q.skip());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('stays quiet on a game reopened later', async () => {
    show({ ...base, changes: [{ playerId: 'D', from: null, to: 1, name: 'Dev' }] }, false);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says a new Wazir, or a defended seat, as a line without a show', () => {
    show({ ...base, changes: [{ playerId: 'A', from: 3, to: 2, name: 'Asha' }] });
    expect(screen.getByTestId('beat')).toHaveTextContent('🥈 Asha is the new Wazir');
  });

  it('twinkles once for a new Wazir or Sitara on a game just ended, and not on one reopened', async () => {
    show({ ...base, changes: [{ playerId: 'A', from: 3, to: 2, name: 'Asha' }] });
    await waitFor(() => expect(playCue).toHaveBeenCalledWith({ name: 'twinkle' }));
    playCue.mockClear();
    show({ ...base, sitara: { held: new Set(), now: new Set(['p0']), rising: ['R'] } }, false);
    await new Promise((r) => setTimeout(r, 20));
    expect(playCue).not.toHaveBeenCalled();
  });

  it('says the Badshah held on', () => {
    show({ ...base, defended: 'p0' });
    expect(screen.getByTestId('beat')).toHaveTextContent('Takht bacha liya');
  });

  it("says a crown change as a line once tonight's shows are used up", async () => {
    for (let i = 0; i < CROWN_SHOWS_A_NIGHT; i++) takeCrownShow();
    show({ ...base, changes: [{ playerId: 'D', from: null, to: 1, name: 'Dev' }] });
    await waitFor(() => expect(screen.getByTestId('line')).toHaveTextContent('Naya Badshah: Dev!'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
