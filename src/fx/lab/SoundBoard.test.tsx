import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SoundBoard from './SoundBoard';
import { SEQUENCES } from './soundSequences';
import { SOUND_TIER } from '../sound';

describe('the Sound Board', () => {
  it('lists every sound once and every sequence, and plays without throwing', async () => {
    render(<SoundBoard />);
    for (const name of Object.keys(SOUND_TIER))
      expect(document.querySelectorAll(`[data-sound="${name}"]`)).toHaveLength(1);
    for (const s of SEQUENCES) expect(screen.getByText(`▶ ${s.title}`)).toBeInTheDocument();
    await userEvent.click(screen.getByText('▶ SOLD'));
    await userEvent.click(document.querySelector('[data-sound="fanfare"]')!);
  });

  it('every sequence names real sounds', () => {
    for (const s of SEQUENCES)
      for (const c of s.plan.cues) expect(SOUND_TIER[c.name]).toBeDefined();
  });
});
