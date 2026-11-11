import { m } from 'framer-motion';
import { useState } from 'react';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { CardName, RoleBadge, cardText } from '@/games/kaali-teeri/screens/hand/parts/bits';
import { Avatar } from '@/components/ui/Avatar';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { PRESS } from '@/components/ui/motion';

/** Who played called card i: any seat, the bidder included, except for "the other one" (the bidder holds its twin). */
export default function PlayedBy() {
  const { state, actions } = useKt();
  // Captured at mount, so the body stays put while the sheet animates out.
  const [sheet] = useState(state.sheet);
  const g = state.game;
  const h = g && curHand(g);
  const i = sheet?.type === 'playedBy' ? sheet.i : -1;
  const c = h?.called[i];
  if (!g || !h || !c || (h.phase !== 'playing' && h.phase !== 'result'))
    return <p className="py-5 text-16 text-[var(--tx2)]">{kp.playedBy.missing}</p>;
  const bidder = g.players.find((p) => p.id === h.bidder);
  const other = c.copy === 'other';
  const seats = g.players.filter((p) => !(other && p.id === h.bidder));
  const cur = h.playedBy[i];
  const pick = (id: string | null) => {
    if (id !== cur) actions.markPlayed(i, id);
    actions.openSheet(null);
  };
  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <PlayingCard rank={c.rank} suit={c.suit} size="md" />
        <div className="min-w-0">
          <p className="disp text-26 font-extrabold leading-[1.1] tracking-[-0.02em]">
            <span aria-hidden>
              {kp.playedBy.who} <CardName c={c} copy={false} />?
            </span>
            <span className="sr-only">{kp.playedBy.question(cardText(c))}</span>
          </p>
          {c.copy !== undefined && (
            <p className="mt-0.5 text-14 font-medium text-[var(--tx2)]">
              {kp.copy[String(c.copy)]}
            </p>
          )}
          {bidder && (
            <p className="mt-1 text-15 text-[var(--tx2)]">{kp.playedBy.joins(bidder.name)}</p>
          )}
        </div>
      </div>
      <div role="group" aria-label={kp.playedBy.title} className="grid grid-cols-2 gap-2">
        {seats.map((p) => {
          const on = cur === p.id;
          const isBidder = p.id === h.bidder;
          // Playing a second called card fills a second slot: say so before they're picked.
          const more = h.playedBy.filter((x, k) => x === p.id && k !== i).length;
          return (
            <m.button
              key={p.id}
              type="button"
              whileTap={PRESS}
              aria-pressed={on}
              onClick={() => pick(p.id)}
              className={`flex min-h-16 min-w-0 items-center gap-2.5 rounded-[18px] px-3 py-2 text-left ${on ? 'mat-fill text-ink-on-accent' : 'mat-fill-s'}`}
            >
              <Avatar
                p={p}
                className="mat-av grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-17 font-bold leading-[1.2]">{p.name}</span>
                {isBidder && <RoleBadge kind="bidder" className="mt-0.5" />}
                {isBidder && (
                  <span className="mt-0.5 block text-13 text-[var(--tx2)]">
                    {kp.playedBy.holds}
                  </span>
                )}
                {more > 0 && !isBidder && (
                  <span className="mt-0.5 block text-13 text-[var(--tx2)]">
                    {kp.playedBy.already(more + 1)}
                  </span>
                )}
              </span>
            </m.button>
          );
        })}
      </div>
      {other && bidder && (
        <p className="mt-3 text-14 text-[var(--tx2)]">{kp.playedBy.otherNote(bidder.name)}</p>
      )}
      {cur != null && (
        <m.button
          type="button"
          whileTap={PRESS}
          onClick={() => pick(null)}
          className="mat-fill-s mt-3 min-h-12 w-full rounded-[18px] px-4 text-16 font-bold"
        >
          {kp.playedBy.clear}
        </m.button>
      )}
    </>
  );
}
