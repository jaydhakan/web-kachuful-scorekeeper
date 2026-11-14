import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { storage } from '@/state/persistence';
import { RankBoard, type BoardEntry } from './RankBoard';

const entry = (id: string, rank: number | null, n: number): BoardEntry => ({
  id,
  who: { name: id, emoji: '🙂', color: 'c' },
  rank,
  n,
  sub: '2 games',
});

const board = (entries: BoardEntry[], props: Partial<Parameters<typeof RankBoard>[0]> = {}) => (
  <RankBoard
    entries={entries}
    show={String}
    gap={String}
    onOpen={() => {}}
    label={(rank, name, value) => `${rank} ${name}, ${value}`}
    unrankedShort="Not ranked"
    unrankedTitle="Not ranked yet"
    {...props}
  />
);
const podium = () => screen.queryByRole('list', { name: 'Top three' });
const step = (k: number) => document.querySelector(`[data-step="${k}"]`)?.closest('li') ?? null;
const five = [
  entry('Asha', 1, 9),
  entry('Bo', 2, 7),
  entry('Cy', 3, 4),
  entry('Dev', 4, 3),
  entry('Eli', null, 8),
];

beforeEach(() => storage.remove('baithak.boardTop'));

describe('the podium on a board', () => {
  it('lifts the top three out of the list, first place first for a keyboard and a screen reader', async () => {
    const onOpen = vi.fn();
    render(board(five, { onOpen }));
    const top = within(podium()!).getAllByRole('button');
    expect(top.map((x) => x.getAttribute('aria-label'))).toEqual([
      '#1 Asha, 9',
      '#2 Bo, 7',
      '#3 Cy, 4',
    ]);
    // On screen the winner stands in the middle: 2nd, 1st, 3rd.
    expect([1, 2, 3].map((k) => step(k)!.className.match(/order-\d/)![0])).toEqual([
      'order-2',
      'order-1',
      'order-3',
    ]);
    expect(within(step(1)!).getByText('1st')).toBeInTheDocument();
    // Everyone else keeps a row: fourth place, then the not-yet-ranked under their heading.
    expect(screen.getByRole('button', { name: '#4 Dev, 3' }).closest('[data-board-podium]')).toBe(
      null,
    );
    expect(screen.getByText('Not ranked yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not ranked Eli, 8' })).toBeInTheDocument();
    await userEvent.click(top[0]);
    expect(onOpen).toHaveBeenCalledWith('Asha');
  });

  it('stands tied players on one step and builds no step for a place nobody holds', () => {
    render(board([entry('Asha', 1, 9), entry('Bo', 1, 9), entry('Cy', 3, 4), entry('Dev', 4, 1)]));
    expect(within(step(1)!).getAllByRole('button')).toHaveLength(2);
    expect(step(2)).toBeNull();
    expect(within(step(3)!).getAllByRole('button')).toHaveLength(1);
  });

  it('is two steps for a board of two', () => {
    render(board([entry('Asha', 1, 9), entry('Bo', 2, 7)]));
    expect(within(podium()!).getAllByRole('button')).toHaveLength(2);
    expect(step(3)).toBeNull();
    // Nobody is left for a list.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('gives way to rows, the top three keeping a medal, when first place is shared by a crowd', () => {
    render(board(['Asha', 'Bo', 'Cy', 'Dev'].map((id) => entry(id, 1, 2))));
    expect(podium()).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getAllByRole('listitem')[0].querySelector('.bg-gold-gradient-v')).not.toBeNull();
  });

  it('stays out of a board that asks for rows only', () => {
    render(board(five, { podium: false }));
    expect(podium()).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});

describe('your own place on a board', () => {
  it('is marked on the podium', () => {
    render(board(five, { you: 'Bo' }));
    expect(within(step(2)!).getByText('You')).toBeInTheDocument();
    expect(within(step(1)!).queryByText('You')).toBeNull();
  });

  it('is a pinned row that says who is next to catch', () => {
    render(board(five, { you: 'Dev' }));
    const mine = screen.getByRole('button', { name: '#4 Dev, 3' });
    expect(mine.closest('li')!.className).toMatch(/sticky/);
    expect(within(mine).getByText('1 behind Cy')).toBeInTheDocument();
  });

  it('says "just behind" when the gap rounds away', () => {
    render(
      board([...five.slice(0, 3), entry('Dev', 4, 3.8)], {
        you: 'Dev',
        show: (n) => String(Math.round(n)),
        gap: (d) => String(Math.round(d)),
      }),
    );
    expect(screen.getByText('Just behind Cy')).toBeInTheDocument();
  });
});

describe('taking first place', () => {
  const first = () => screen.getByRole('status').textContent;

  it('is announced once per board, and again only after losing it', () => {
    const mine = { you: 'Asha', celebrate: 'test:points:all' };
    const a = render(board(five, mine));
    expect(first()).toBe('You are in first place.');
    a.unmount();
    const again = render(board(five, mine));
    expect(first()).toBe('');
    again.unmount();
    // Bo takes the lead, then Asha takes it back.
    render(board([entry('Bo', 1, 12), entry('Asha', 2, 9), entry('Cy', 3, 4)], mine)).unmount();
    render(board(five, mine));
    expect(first()).toBe('You are in first place.');
  });

  it('is not announced to anyone else, nor on a board that does not ask', () => {
    render(board(five, { you: 'Bo', celebrate: 'test:points:all' })).unmount();
    expect(storage.get('baithak.boardTop', {})).toEqual({});
    render(board(five, { you: 'Asha' }));
    expect(first()).toBe('');
  });
});
