import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetFxForTests } from '@/fx/prefs';
import { KEYS, storage } from '@/state/persistence';
import { SoundRailButton, SoundRow } from './QuickMute';

const saved = () => storage.get<{ sounds: string }>(KEYS.fx, { sounds: '' }).sounds;

beforeEach(() => resetFxForTests());

describe('the quick mute', () => {
  it('cycles All, Big moments, Off in the one shared setting, and says so in a toast', async () => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    resetFxForTests();
    const toast = vi.fn();
    render(<SoundRow i={0} rule={false} onToast={toast} />);
    const row = () => screen.getByRole('button');
    expect(row()).toHaveTextContent('Sounds: All');
    await userEvent.click(row());
    expect(saved()).toBe('moments');
    expect(row()).toHaveTextContent('Sounds: Big moments');
    await userEvent.click(row());
    expect(saved()).toBe('off');
    await userEvent.click(row());
    expect(saved()).toBe('all');
    expect(toast.mock.calls.map((c) => c[0])).toEqual([
      'Sounds: Big moments',
      'Sounds: Off',
      'Sounds: All',
    ]);
  });

  it('the rail button is a real button with a name that says the state', async () => {
    render(<SoundRailButton onToast={() => undefined} />);
    const b = screen.getByRole('button', { name: /Sounds: Big moments, tap to change/ });
    expect(b.className).toContain('h-12');
    await userEvent.click(b);
    expect(saved()).toBe('off');
  });
});
