import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EASE, SPRING } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import { say } from '@/platform/notice';
import { platform } from '@/strings/platform';
import { seatInvites as s } from '@/strings/seatInvites';
import { gameOfKind, onSeatInvites, useSeatInvites, type SeatInvite } from '@/sync/seatInvites';
import { bannerCandidate, markTold, useInvitesQuieted } from '@/sync/seatInviteSignals';
import { InviteButton } from './InviteCard';
import { joinInvite } from './join';

/** How long a banner stays when nobody touches it. */
export const BANNER_MS = 8000;
/** A beat after an invite arrives before it slides in, so it never lands mid page-change. */
const BEAT_MS = 350;

const gameName = (inv: SeatInvite) =>
  (platform.games as Record<string, { name: string } | undefined>)[gameOfKind(inv.kind)]?.name;

/** The text the banner shows (and announces) for an invite. */
export function bannerText(inv: SeatInvite) {
  const name = gameName(inv);
  return {
    title: name ? s.invitedYouTo(inv.from.name, name) : s.invitedYou(inv.from.name),
    line: [inv.table.name, inv.partner ? s.partner(inv.partner.name) : null]
      .filter(Boolean)
      .join(' · '),
  };
}

/**
 * The invite banner, mounted once over the landing page and every game: an invite that arrives while Baithak is
 * open slides down from the top with Join and Later, and slides away after 8 s. The timer waits while a finger,
 * the pointer or focus is on it, and while the page is hidden. Nothing shows while a game keeps invites quiet.
 */
export function InviteBanner() {
  const [inv, setInv] = useState<SeatInvite | null>(null);
  const [said, setSaid] = useState('');
  const rm = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const live = useSeatInvites();
  const quiet = useInvitesQuieted();

  // Picks the next invite to announce whenever the store changes and nothing is showing.
  useEffect(() => {
    if (inv) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const pick = () => {
      clearTimeout(t);
      if (!bannerCandidate()) return;
      t = setTimeout(() => {
        const next = bannerCandidate();
        if (!next) return;
        markTold([next.id]);
        setInv(next);
        const tx = bannerText(next);
        setSaid(`${tx.title}. ${tx.line}`);
        vibrate(12);
      }, BEAT_MS);
    };
    pick();
    const off = onSeatInvites(pick);
    return () => {
      off();
      clearTimeout(t);
    };
  }, [inv]);

  const close = useCallback(() => {
    if (box.current?.contains(document.activeElement))
      (document.activeElement as HTMLElement).blur();
    setInv(null);
  }, []);

  // Gone from the list (answered elsewhere, cancelled, expired) or quietened: the banner goes too.
  useEffect(() => {
    if (inv && (quiet || !live.some((i) => i.id === inv.id))) close();
  }, [inv, live, quiet, close]);

  // Auto-hide, paused while held, hovered, focused or hidden.
  useEffect(() => {
    const el = box.current;
    if (!inv || !el) return;
    let left = BANNER_MS,
      since = 0,
      running = false,
      held = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (!running) return;
      running = false;
      clearTimeout(t);
      left -= Date.now() - since;
    };
    const run = () => {
      if (running || held > 0 || document.visibilityState !== 'visible') return;
      running = true;
      since = Date.now();
      t = setTimeout(close, Math.max(left, 0));
    };
    const grab = () => {
      held++;
      stop();
    };
    const release = () => {
      held = Math.max(0, held - 1);
      run();
    };
    const vis = () => (document.visibilityState === 'visible' ? run() : stop());
    run();
    el.addEventListener('pointerenter', grab);
    el.addEventListener('pointerleave', release);
    el.addEventListener('focusin', grab);
    el.addEventListener('focusout', release);
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearTimeout(t);
      el.removeEventListener('pointerenter', grab);
      el.removeEventListener('pointerleave', release);
      el.removeEventListener('focusin', grab);
      el.removeEventListener('focusout', release);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [inv, close]);

  const join = async () => {
    if (!inv) return;
    const now = inv;
    close();
    const r = await joinInvite(now);
    if (r === 'filled') say(s.filled);
    else if (r === 'error') say(s.failed);
  };

  const tx = inv && bannerText(inv);
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <AnimatePresence>
        {inv && tx && (
          <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+0.25rem)] z-[64] flex justify-center px-2.5">
            <m.div
              key={inv.id}
              ref={box}
              role="region"
              aria-label={s.bannerLabel}
              onKeyDown={(e) => e.key === 'Escape' && close()}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: '-130%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                rm
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, y: '-130%', transition: { duration: 0.24, ease: EASE } }
              }
              transition={rm ? { duration: 0.15 } : SPRING}
              className="mat-toast pointer-events-auto flex w-full max-w-[30rem] items-center gap-2.5 rounded-[22px] py-2.5 pl-3 pr-2.5"
            >
              <Avatar
                p={inv.from}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-20"
              />
              <div className="min-w-0 flex-1">
                <p className="[overflow-wrap:anywhere] text-14 font-bold">{tx.title}</p>
                {tx.line && (
                  <p className="[overflow-wrap:anywhere] text-13 opacity-80">{tx.line}</p>
                )}
              </div>
              <InviteButton className="!min-h-11 !px-3.5 !text-14" onClick={close}>
                {s.later}
              </InviteButton>
              <InviteButton
                accent
                className="!min-h-11 !px-3.5 !text-14"
                onClick={() => void join()}
              >
                {s.join}
              </InviteButton>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
