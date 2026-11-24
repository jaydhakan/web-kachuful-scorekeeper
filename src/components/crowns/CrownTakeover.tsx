import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Confetti } from '@/components/ui/Confetti';
import { EASE, MOMENT_MAX_MS, SPRING_POP } from '@/components/ui/motion';
import { HAPTIC } from '@/fx/feedback';
import { momentRoot, PRIORITY, takeCrownShow, useMoments } from '@/fx/moments';
import type { TableCrowns } from './table';
import { medals as s } from '@/strings/medals';
import { palette } from '@/theme/palette';

const GOLD = [palette['gold-light'], palette.gold, palette['gold-mid']];
/** How long the full show holds before it leaves by itself (the queue's ceiling is MOMENT_MAX_MS). */
const SHOW_MS = MOMENT_MAX_MS - 200;

/**
 * The end of a fresh game when gold changes hands (REWARDS-PLAN §6.7), after the podium: "Naya Badshah!" (the old
 * Badshah's gold leaves their name, a gold burst falls). A Moment on the queue (`id`, `scope`: the game's): one tap or
 * Escape skips it; reduced motion shows the same card still. Returns the overlay, or null.
 */
export function useCrownTakeover(
  t: TableCrowns,
  id: string,
  scope: string,
  fresh: boolean,
  afterMs: number,
) {
  const { changes } = t;
  const q = useMoments();
  const [on, setOn] = useState(false);
  // Past tonight's crown shows, or over a cap, the change is a line under the headline instead (§13).
  const [small, setSmall] = useState(false);
  // The shells clear `fresh` at once under reduced motion; the still card plays anyway, so keep it as opened.
  const [justEnded] = useState(fresh);
  const gold = changes.find((c) => c.to === 1 && c.from !== 1);
  const old = changes.find((c) => c.from === 1 && c.to !== 1);
  // The old Badshah's own new medal is said by "was Badshah"; the card lists the rest.
  const rest = changes.filter((c) => (c.to === 2 || c.to === 3) && c.playerId !== old?.playerId);
  const show = !!gold;
  useEffect(() => {
    if (!justEnded || !show) return;
    const play = ({ signal }: { signal: AbortSignal }) =>
      new Promise<void>((done) => {
        setOn(true);
        const end = () => {
          clearTimeout(t);
          setOn(false);
          done();
        };
        const t = setTimeout(end, SHOW_MS);
        signal.addEventListener('abort', end);
      });
    const t = setTimeout(
      () =>
        !takeCrownShow()
          ? setSmall(true)
          : q.push({
              id,
              tier: 'moment',
              priority: PRIORITY.verdict,
              scope,
              sound: 'shehnai',
              haptic: HAPTIC.BIG,
              play,
              reduced: play,
              downgrade: () => setSmall(true),
            }),
      afterMs,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the game that just ended
  }, [justEnded, show]);
  return {
    node: on && gold ? <Takeover gold={gold.name} old={old?.name} rest={rest} /> : null,
    line: small && gold ? s.newBadshah(gold.name) : null,
  };
}

function Takeover({
  gold,
  old,
  rest,
}: {
  gold: string;
  old?: string;
  rest: { name: string; to: 1 | 2 | 3 | null }[];
}) {
  const rm = useReducedMotion();
  const [burst, setBurst] = useState(true);
  return createPortal(
    <m.div
      data-medal-takeover
      role="alert"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="fixed inset-0 z-[80] grid place-items-center bg-[color-mix(in_srgb,var(--shade)_72%,transparent)] px-6 text-center"
    >
      <m.div
        initial={rm ? false : { y: 24, scale: 0.94 }}
        animate={{ y: 0, scale: 1 }}
        transition={SPRING_POP}
        className="flex w-full max-w-[22rem] flex-col items-center gap-2 rounded-[28px] border border-[var(--hairline-2)] bg-[var(--sheet-bg)] px-6 pb-7 pt-6 shadow-[0_24px_60px_-12px_color-mix(in_srgb,var(--shade)_70%,transparent)]"
      >
        <m.span
          aria-hidden
          // The medal turns over.
          initial={rm ? false : { rotateY: 90, scale: 0.6 }}
          animate={{ rotateY: 0, scale: 1 }}
          transition={{ ...SPRING_POP, delay: 0.15 }}
          className="text-72 leading-none"
        >
          {s.glyph[1]}
        </m.span>
        <m.h2
          initial={rm ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING_POP, delay: rm ? 0 : 0.7 }}
          className="disp text-32 font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]"
        >
          <span className="medal-1 medal-sheen">{s.newBadshah(gold)}</span>
        </m.h2>
        {old && (
          // The old Badshah's gold lifts off their name and leaves it plain.
          <p className="text-15 text-[var(--tx2)]">
            <span className="relative font-bold">
              {old}
              <m.span
                aria-hidden
                initial={rm ? { opacity: 0 } : { opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: rm ? 0 : -14, scale: rm ? 1 : 1.2 }}
                transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
                className="medal-1 absolute inset-0"
              >
                {old}
              </m.span>
            </span>{' '}
            {s.wasBadshah}
          </p>
        )}
        {rest.map((c) => (
          <p key={c.name + c.to} className={`text-15 font-semibold medal-${c.to}`}>
            {s.movedTo(c.to as 2 | 3, c.name)}
          </p>
        ))}
      </m.div>
      {burst && !rm && <Confetti colors={GOLD} count={70} onDone={() => setBurst(false)} />}
    </m.div>,
    momentRoot(),
  );
}

/**
 * The small line under the headline when nothing takes the screen: a new Wazir or Senapati or a Badshah who held on,
 * and a new Sitara (a beat, no show). Two at most, joined. `twinkle`: a swap or a new Sitara, worth a sound.
 */
export function crownBeat({ changes, defended, sitara }: TableCrowns): {
  line: string | null;
  twinkle: boolean;
} {
  const lines: string[] = [];
  let swap = false;
  if (!changes.some((c) => c.to === 1 && c.from !== 1)) {
    const moved = changes.find((c) => c.to === 2 || c.to === 3);
    if (moved) lines.push(s.movedTo(moved.to as 2 | 3, moved.name));
    else if (defended) lines.push(s.defended);
    swap = !!moved;
  }
  // Tonight's lead moved to someone at this table.
  if (sitara.rising.length) lines.push(s.newSitara(sitara.rising.join(', ')));
  return {
    line: lines.length ? lines.join(' · ') : null,
    twinkle: swap || sitara.rising.length > 0,
  };
}
