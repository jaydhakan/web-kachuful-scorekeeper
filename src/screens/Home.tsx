import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { curRound, doneRounds, standings } from '@/domain';
import { agoTxt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';

const SUITS = ['♠', '♦', '♣', '♥'] as const;

export function Home() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    ld = standings(g)[0];
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const rm = useReducedMotion();
  useAnimationFrame((t) => {
    els.current.forEach((el, i) => {
      if (!el) return;
      const a = rm ? (i * Math.PI) / 2 : (t / 9000) * Math.PI * 2 + (i * Math.PI) / 2;
      el.style.transform = `translate3d(${Math.cos(a) * 138}px, ${Math.sin(a) * 82}px, 0) scale(${0.85 + 0.25 * Math.sin(a)})`;
      el.style.opacity = Math.sin(a) > 0 ? '1' : '0.5';
      el.style.zIndex = Math.sin(a) > 0 ? '3' : '0';
    });
  });
  const fin = g.status === 'finished';
  return (
    <div className="absolute inset-0 flex flex-col pt-[var(--sat)]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE }}
          className="relative h-[200px] w-[320px] max-w-full"
        >
          {SUITS.map((s, i) => (
            <span
              key={s}
              aria-hidden
              ref={(e) => {
                els.current[i] = e;
              }}
              className={`absolute left-1/2 top-1/2 -ml-4 -mt-4 grid h-8 w-8 place-items-center text-30 [text-shadow:0_0_14px_var(--glow)] ${s === '♦' || s === '♥' ? 'text-suit-red' : 'text-suit-black'}`}
              style={{ willChange: 'transform' }}
            >
              {s}
            </span>
          ))}
          <div className="absolute inset-0 grid place-content-center text-center">
            <h1 className="disp gold-text text-72 font-extrabold leading-none tracking-[-0.055em]">
              {t.appName}
            </h1>
            <p className="mt-2 text-16 tracking-[0.02em] text-[var(--tx2)]">{t.tagline}</p>
          </div>
        </motion.div>
        <motion.div {...stagger(1, 0.25)} className="w-full">
          <Glass glow onClick={actions.resume} className="w-full cursor-pointer p-5 text-left">
            <div className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
              {fin ? t.home.finished : t.home.resume}
            </div>
            {fin ? (
              <>
                <div className="disp mt-1 text-24 font-bold tracking-[-0.025em]">
                  {t.home.wonWith(ld.p.name, sgnN(ld.t))}
                </div>
                <div className="mt-1 text-16 text-[var(--tx2)]">
                  {t.home.roundsPlayed(doneRounds(g).length)}
                </div>
              </>
            ) : (
              <>
                <div className="disp mt-1 text-24 font-bold tracking-[-0.025em]">
                  {t.home.roundLine(r.index + 1, r.cards, r.trump)}
                </div>
                <div className="mt-1.5 text-16">
                  {t.home.dealing(g.players[r.dealerIndex].name)}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-16">
                  <Dot p={ld.p} />
                  <span>{t.home.leads(ld.p.name, sgnN(ld.t))}</span>
                </div>
              </>
            )}
            <div className="mt-2 text-13 text-[var(--tx2)]">
              {t.home.saved(agoTxt(g.updatedAt))}
            </div>
          </Glass>
        </motion.div>
        <motion.button
          type="button"
          {...stagger(2, 0.3)}
          whileTap={{ scale: 0.95 }}
          onClick={() => actions.openSheet({ type: 'rules' })}
          className="min-h-12 px-3 text-16 font-medium text-[var(--tx2)] underline decoration-white/25 underline-offset-[5px]"
        >
          {t.home.howToPlay}
        </motion.button>
      </div>
      <div className="chrome-bot flex min-h-[96px] items-center px-5 pb-[max(18px,var(--sab))] pt-[18px]">
        <PrimaryButton
          className="w-full"
          onClick={() => (g.status === 'active' ? actions.ask('newGame') : actions.startSetup())}
        >
          {t.home.newGame}
        </PrimaryButton>
      </div>
    </div>
  );
}
