import { render, screen } from '@testing-library/react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RANKS, SUITS, artToken, cardKey } from '@/lib/cards';
import { PlayingCard } from './PlayingCard';

const styles = path.resolve(import.meta.dirname, '../../styles');
const emerald = readFileSync(path.join(styles, 'themes/emerald-gilt.css'), 'utf8');
const standins = path.resolve(import.meta.dirname, '../../assets/themes/emerald-gilt/standins');
const REAL = {
  'k-clubs': 'king-clubs',
  'k-diamonds': 'king-diamonds',
  'k-spades': 'king-spades',
  'q-hearts': 'queen-hearts',
};

describe('PlayingCard', () => {
  it('is named for its own rank and suit', () => {
    render(<PlayingCard rank="3" suit="spades" />);
    expect(screen.getByRole('img', { name: 'Three of spades' })).toBeInTheDocument();
    render(<PlayingCard rank="10" suit="diamonds" />);
    expect(screen.getByRole('img', { name: 'Ten of diamonds' })).toBeInTheDocument();
    render(<PlayingCard rank="Q" suit="hearts" />);
    expect(screen.getByRole('img', { name: 'Queen of hearts' })).toBeInTheDocument();
  });

  it.each(SUITS.flatMap((s) => RANKS.map((r) => [r, s] as const)))(
    '%s of %s points every layer at its own card',
    (rank, suit) => {
      const { container } = render(<PlayingCard rank={rank} suit={suit} />);
      const card = container.querySelector('.playing-card')!;
      const key = cardKey(rank, suit);
      expect(card.getAttribute('data-card')).toBe(key);
      expect(card.querySelector('.card-standin')!.getAttribute('data-card')).toBe(key);
      const photo = card.querySelector<HTMLElement>('.card-photo')!;
      expect(photo.style.backgroundImage).toBe(`var(${artToken(rank, suit)}, none)`);
      // The flat face keeps its own rank and pip, so a card with no art never shows another's.
      expect(card.querySelector('.card-flat')!.textContent).toContain(rank);
    },
  );

  it('maps keys and tokens as the files are named', () => {
    expect(cardKey('10', 'diamonds')).toBe('10d');
    expect(artToken('10', 'diamonds')).toBe('--art-card-10-diamonds');
    expect(cardKey('Q', 'hearts')).toBe('qh');
    expect(artToken('K', 'spades')).toBe('--art-card-k-spades');
  });

  it('face down shows the back and nothing of the face', () => {
    const { container } = render(<PlayingCard rank="A" suit="spades" face="down" />);
    const card = screen.getByRole('img', { name: 'Face-down card' });
    expect(card.getAttribute('data-card')).toBeNull();
    expect(container.querySelector('.card-flat, .card-standin, .card-photo')).toBeNull();
    expect(container.textContent).toBe('');
    expect(container.querySelector('.bg-card-back')).not.toBeNull();
  });
});

describe('Emerald Gilt card art', () => {
  const tokenOf = (k: string) => emerald.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim();

  it('declares every card token: the four real court cards set, the rest none', () => {
    for (const s of SUITS)
      for (const r of RANKS) {
        const k = `${r.toLowerCase()}-${s}`;
        const real = REAL[k as keyof typeof REAL];
        expect(tokenOf(artToken(r, s))).toBe(
          real ? `url('../../assets/themes/emerald-gilt/${real}.webp')` : 'none',
        );
      }
  });

  it('gives every card without photo art a stand-in pointing at its own file', () => {
    const rules = [
      ...emerald.matchAll(
        /\.card-standin\[data-card='(\w+)'\]\s*\{\s*background-image: url\('([^']+)'\)/g,
      ),
    ];
    const want = SUITS.flatMap((s) => RANKS.map((r) => [r, s] as const))
      .filter(([r, s]) => !(`${r.toLowerCase()}-${s}` in REAL))
      .map(([r, s]) => cardKey(r, s))
      .sort();
    expect(rules.map((m) => m[1]).sort()).toEqual(want);
    for (const [, key, url] of rules) {
      expect(url).toBe(`../../assets/themes/emerald-gilt/standins/card-${key}.svg`);
      expect(existsSync(path.join(standins, `card-${key}.svg`))).toBe(true);
    }
  });

  it('paints stand-ins and card art in no other theme', () => {
    const others = readdirSync(path.join(styles, 'themes'))
      .filter((f) => f !== 'emerald-gilt.css')
      .map((f) => readFileSync(path.join(styles, 'themes', f), 'utf8'))
      .concat(readFileSync(path.join(styles, 'themes.css'), 'utf8'));
    for (const css of others) {
      expect(css).not.toMatch(/standins\//);
      expect(css).not.toMatch(/--art-card-[\w-]+:\s*url/);
    }
  });

  it('marks the 3 of spades as the special card', () => {
    const svg = readFileSync(path.join(standins, 'card-3s.svg'), 'utf8');
    const plain = readFileSync(path.join(standins, 'card-3h.svg'), 'utf8');
    expect(svg).toMatch(/scale\(0\.56\)/);
    expect(plain).not.toMatch(/scale\(0\.56\)/);
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
