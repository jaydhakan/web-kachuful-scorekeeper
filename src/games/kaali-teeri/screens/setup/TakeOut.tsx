import { cardsEach, removedCards, sameCard, type CardRef } from '@/games/kaali-teeri/domain';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { TR } from '@/theme/trumps';
import { t } from '@/strings';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';

/** The cards to take out for n players, one entry per card with how many copies (2 = both decks). */
export function takeOutGroups(n: number): { card: CardRef; copies: number }[] {
  const out: { card: CardRef; copies: number }[] = [];
  for (const c of removedCards(n)) {
    const g = out.find((x) => sameCard(x.card, c));
    if (g) g.copies++;
    else out.push({ card: c, copies: 1 });
  }
  return out;
}

/**
 * The cards to take out as a small fan, beside "Take out 2♣ and 2♦" over "deal 10 each". Screen readers get one
 * sentence with the cards named in words; the fan and the symbols are decoration.
 */
export function TakeOut({ n, className = '' }: { n: number; className?: string }) {
  const groups = takeOutGroups(n),
    each = cardsEach(n);
  const said = s.takeOutSay(
    groups.map((g) => s.copies(t.card.name(g.card.rank, g.card.suit), g.copies)),
    each,
  );
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="sr-only">{said}</span>
      <span aria-hidden className="flex shrink-0 items-center">
        {groups.length ? (
          groups.map((g, i) => (
            <span
              key={`${g.card.rank}${g.card.suit}`}
              className={i > 0 ? '-ml-3' : ''}
              style={{ transform: `rotate(${(i - (groups.length - 1) / 2) * 7}deg)` }}
            >
              <PlayingCard rank={g.card.rank} suit={g.card.suit} size="xs" />
            </span>
          ))
        ) : (
          <PlayingCard rank="3" suit="spades" face="down" size="xs" />
        )}
      </span>
      <span aria-hidden className="min-w-0 text-left leading-tight">
        <span className="block text-16 font-semibold">
          {groups.length
            ? s.takeOutLine(
                groups.map((g) => ({ name: g.card.rank + TR[g.card.suit].sym, copies: g.copies })),
              )
            : s.nothingOut}
        </span>
        <span className="block text-14 text-[var(--tx2)]">{s.dealEach(each)}</span>
      </span>
    </div>
  );
}
