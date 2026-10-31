import type { ReactNode } from 'react';
import type { Game } from '@/domain';

const word = (g?: Game) => (g ? (g.direction === 'cw' ? 'left' : 'right') : 'left');

export function RulesBody({ game }: { game: Game }) {
  const items: [string, string, ReactNode][] = [
    [
      '🪑',
      'Seating & dealing',
      <>
        Sit in a circle. The dealer deals one card at a time, starting with the player on their{' '}
        <b>{word(game)}</b> and finishing with themselves. The deal passes to the next player each
        round.
      </>,
    ],
    [
      '🔢',
      'Card sequence',
      <>
        Start at <b>3</b> cards and go up one at a time to the maximum (<b>10</b> for 3–5 players,{' '}
        <b>8</b> for 6, <b>7</b> for 7). Repeat the max once, come back down to 3, repeat 3 once,
        then climb again.
        <div className="mt-1 text-13 text-[var(--tx2)]">
          10-card game: 3 4 5 6 7 8 9 10 10 9 8 7 6 5 4 3 3 4 …
        </div>
      </>,
    ],
    [
      '♠',
      'Trump order',
      <>
        Trump rotates every round:{' '}
        <b>
          ♠ Spades → <span className="text-suit-red">♦ Diamonds</span> → ♣ Clubs →{' '}
          <span className="text-suit-red">♥ Hearts</span>
        </b>
        , then starts again.
      </>,
    ],
    [
      '🎯',
      'Bidding & the dealer restriction',
      <>
        Everyone predicts how many tricks they will win (0 up to the cards dealt), starting with the
        player after the dealer. The dealer bids <b>last</b> and can’t pick a number that makes all
        bids add up to the cards dealt, so someone always misses.
        <div className="mt-2 rounded-2xl bg-white/[.06] p-3">
          4 players, 5 cards. The first three bid <b>2 + 1 + 0 = 3</b>. The dealer can’t bid{' '}
          <b>2</b>, because the total would be 5. Any other bid is fine.
        </div>
      </>,
    ],
    [
      '🃏',
      'Playing a trick',
      <>
        The player after the dealer leads. Follow the led suit if you can. If you can’t, play a
        trump or discard anything. The highest trump wins; with no trump, the highest card of the
        led suit wins. The winner leads next.
      </>,
    ],
    [
      '🏆',
      'Scoring',
      <>
        <table className="my-1.5 w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-1.5">Bid</th>
              <th>Made</th>
              <th>Missed</th>
            </tr>
          </thead>
          <tbody>
            {[
              [0, 10],
              [1, 10],
              [3, 30],
              [7, 70],
            ].map(([b, v]) => (
              <tr key={b} className="border-t border-white/10">
                <td className="py-2">{b}</td>
                <td className="font-bold text-[var(--pos)]">+{v}</td>
                <td className="font-bold text-[var(--neg)]">−{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-13 text-[var(--tx2)]">
          Exactly your bid scores bid × 10 (a bid of 0 counts as 10). Any other number of tricks
          loses the same amount. Totals can go negative.
        </div>
      </>,
    ],
  ];
  return (
    <div className="text-16 leading-[1.55] text-tx-rules">
      {items.map(([ic, t, b]) => (
        <div key={t} className="mb-5">
          <h3 className="disp mb-1.5 text-20 font-extrabold tracking-[-0.025em]">
            {ic} {t}
          </h3>
          {b}
        </div>
      ))}
    </div>
  );
}
