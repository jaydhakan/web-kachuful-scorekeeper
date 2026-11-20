import { render } from '@testing-library/react';
import { AvatarState, moodOf } from './AvatarState';

describe('avatar moods', () => {
  it('makes a sole leader smug and a sole last place sulk from round 3', () => {
    expect(moodOf(1, [1, 2, 3], 1)).toBe('smug');
    expect(moodOf(1, [1, 1, 3], 4)).toBeNull();
    expect(moodOf(3, [1, 2, 3], 2)).toBeNull();
    expect(moodOf(3, [1, 2, 3], 3)).toBe('sulk');
    expect(moodOf(2, [1, 2, 2], 5)).toBeNull();
    expect(moodOf(1, [1], 5)).toBeNull();
  });

  it('draws the glyph as decoration only', () => {
    const { container } = render(
      <AvatarState mood="sulk">
        <i />
      </AvatarState>,
    );
    expect(container.querySelector('[data-mood="sulk"] [aria-hidden]')?.textContent).toBe('☁️');
  });
});
