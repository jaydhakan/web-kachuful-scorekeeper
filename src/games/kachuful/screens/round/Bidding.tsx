import { roundAt, type Game, type Round } from '@/games/kachuful/domain';
import { t } from '@/strings';
import { Avatar, type Face } from '@/components/ui/Avatar';

/** Who deals and how many cards, big enough to read across the table; first card and a sized-up trump under it. */
export function DealLine({ g, r }: { g: Game; r: Round }) {
  const prev = r.index > 0 ? roundAt(g, r.index - 1).cards : 0,
    ar = r.cards > prev ? '↑' : r.cards < prev ? '↓' : '→';
  return (
    <>
      <span className="disp face-body block text-20 font-bold leading-[1.2] tracking-[-0.02em] [&_[data-n]]:text-28 [&_[data-n]]:leading-none [&_[data-n]]:text-[var(--accent)] wide:text-22 wide:[&_[data-n]]:text-32">
        {t.deal.head(g.players[r.dealerIndex].name, r.cards)}
      </span>
      <span className="mt-1 block text-15 leading-[1.35] text-[var(--tx2)] [&_b]:text-[var(--tx)] [&_[data-t]]:text-20 [&_[data-t]]:font-bold wide:[&_[data-t]]:text-22">
        {t.round.dealSub(g.players[r.firstPlayerIndex].name, r.trump, ar)}
      </span>
    </>
  );
}

/**
 * The hero "who" row (DESIGN-SYSTEM.md, Hero layout): avatar, a kicker, the player's name set big, and the live bid tally. The
 * name steps down with its length so it stays on one line at 360px; short screens scale the whole row.
 */
export function HeroWho({
  p,
  kicker,
  tally,
  of,
}: {
  p: Face & { name: string };
  kicker: string;
  tally: number;
  of: number;
}) {
  const len = Math.max(1, [...p.name].length);
  const k = Math.max(0.42, Math.min(1, 6.5 / len));
  // Never wider than its column: about 0.62em a letter in the widest face (Bricolage at 800), so a name never breaks.
  const fit = `calc(100cqw / ${(len * 0.62).toFixed(2)})`;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3.5 px-1 [--hero-s:1] @h-short:[--hero-s:.6] @h-tiny:[--hero-s:.5]">
      <Avatar
        p={p}
        className="mat-av grid h-[calc(52px*var(--hero-s))] w-[calc(52px*var(--hero-s))] min-h-10 min-w-10 shrink-0 place-items-center self-center rounded-full text-28"
      />
      <div className="min-w-0 [container-type:inline-size]">
        <p className="mono-label text-[0.6875rem] font-medium leading-4 text-[var(--tx2)]">
          {kicker}
        </p>
        <h2
          className="hero-name pb-[0.06em] [overflow-wrap:anywhere]"
          style={{
            fontSize: `max(1.5rem, min(${fit}, calc(var(--big-size) * ${k} * var(--hero-s))))`,
            // The size is the theme's, the line box is not: every theme's row is the same height.
            lineHeight: `max(1.4rem, calc(59px * ${k} * var(--hero-s)))`,
          }}
        >
          {p.name}
        </h2>
      </div>
      {/* The meter below says the same in words. */}
      <p aria-hidden className="hero-tally flex items-baseline gap-0.5 leading-none">
        <span style={{ fontSize: 'max(1.5rem, calc(44px * var(--hero-s)))' }}>{tally}</span>
        <small>/{of}</small>
      </p>
    </div>
  );
}
