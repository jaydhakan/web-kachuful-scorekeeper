import { render } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import type { Player } from '@/sync/types';
import { AccountChip } from './AccountChip';
import { PlayerTag } from './ui/PlayerTag';

const PHOTO = '/api/players/p1/photo?v=3';
const me: Player = {
  id: 'p1',
  displayName: 'Jay',
  email: 'me@test.dev',
  photoUrl: PHOTO,
  firstName: null,
  lastName: null,
  emoji: '🦊',
  color: 'c1',
  createdBy: null,
  linkedUserId: 'u1',
  mergedInto: null,
  createdAt: 0,
  updatedAt: 0,
};

const img = (el: HTMLElement) => el.querySelector(`img[src="${PHOTO}"]`);

describe('a player with a photo', () => {
  it('shows it in a name tag, with the emoji kept underneath', () => {
    const { container } = render(<PlayerTag p={me} name={me.displayName} />);
    expect(img(container)).not.toBeNull();
    expect(container).toHaveTextContent('Jay');
  });

  it('shows it in the account chip on Home', async () => {
    localStorage.setItem(
      KEYS.session,
      JSON.stringify({
        user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: 'p1' },
        player: me,
      }),
    );
    await archive.ready;
    const { container } = render(
      <AppProvider>
        <AccountChip />
      </AppProvider>,
    );
    expect(img(container)).not.toBeNull();
  });
});
