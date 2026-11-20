import { render } from '@testing-library/react';
import { MedalName } from './MedalName';

describe('a medallist’s name', () => {
  it('is plain text without a medal', () => {
    const { container } = render(<MedalName name="Asha" />);
    expect(container.textContent).toBe('Asha');
    expect(container.querySelector('[class*="medal-"]')).toBeNull();
  });

  it('is gold with a sheen, the medal after it and the title for screen readers', () => {
    const { container } = render(<MedalName name="Riya" mark={{ medal: 1, defending: false }} />);
    const letters = container.querySelector('.medal-1')!;
    expect(letters.textContent).toBe('Riya');
    expect(letters.classList.contains('medal-sheen')).toBe(true);
    expect(container.querySelector('[aria-hidden]')?.textContent).toBe('🥇');
    expect(container.querySelector('.sr-only')?.textContent).toBe(", Badshah, this month's #1");
  });

  it("keeps a defending medal quiet: no sheen, a faded glyph, last month's title", () => {
    const { container } = render(<MedalName name="Dev" mark={{ medal: 2, defending: true }} />);
    expect(container.querySelector('.medal-2')?.classList.contains('medal-sheen')).toBe(false);
    expect(container.querySelector('[aria-hidden]')?.className).toContain('opacity-60');
    expect(container.querySelector('.sr-only')?.textContent).toBe(", Wazir, last month's #2");
  });

  it('draws a crack when the medal is slipping, and can leave the glyph out', () => {
    const { container } = render(
      <MedalName name="Kabir" mark={{ medal: 3, defending: false }} slipping glyph={false} />,
    );
    expect(container.querySelector('svg.medal-crack')).not.toBeNull();
    expect(container.textContent).toBe("Kabir, Senapati, this month's #3");
  });
});
