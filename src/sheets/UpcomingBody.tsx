import { motion } from 'framer-motion';
import { curRound, roundAt } from '@/domain';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { Glass } from '@/components/ui/Glass';
import { stagger } from '@/components/ui/stagger';

export function UpcomingBody() {
  const { state } = useApp();
  const g = state.game,
    cr = curRound(g),
    base = cr.phase === 'done' ? cr.index + 1 : cr.index;
  return (
    <>
      {Array.from({ length: 7 }, (_, k) => {
        const i = base + k,
          r = roundAt(g, i),
          tag = r.cards === g.maxCards ? 'Peak round' : r.cards === 3 && i > 0 ? 'Back to 3' : '';
        return (
          <motion.div key={i} {...stagger(k)} className="mb-2">
            <Glass
              className={`flex min-h-[72px] items-center gap-3 p-3 ${k === 0 ? 'ring-1 ring-[var(--accent)] shadow-[0_0_28px_-6px_var(--glow)]' : ''}`}
            >
              <div className="disp min-w-12 text-center text-40 font-extrabold leading-none tracking-[-0.04em]">
                {r.cards}
              </div>
              <div className="w-[34px] text-center text-30" style={{ color: TR[r.trump].col }}>
                {TR[r.trump].sym}
              </div>
              <div className="min-w-0 flex-1 text-16 leading-[1.3]">
                <div className="text-13 font-bold text-[var(--tx2)]">
                  {k === 0 ? (cr.phase === 'done' ? 'NEXT · ' : 'NOW · ') : ''}ROUND {i + 1}{' '}
                  {tag && (
                    <span className="ml-1 rounded-[10px] bg-[var(--gold)] px-2 py-0.5 text-13 text-ink-gold">
                      {tag}
                    </span>
                  )}
                </div>
                👑 {g.players[r.dealerIndex].name} deals → {g.players[r.firstPlayerIndex].name}{' '}
                first
              </div>
              <div className="flex w-10 flex-wrap justify-center gap-[3px]">
                {g.players.map((_, j) => (
                  <i
                    key={j}
                    className={`h-2 w-2 rounded-full ${j === r.dealerIndex ? 'bg-[var(--gold)] shadow-[0_0_6px_var(--gold)]' : 'bg-white/25'}`}
                  />
                ))}
              </div>
            </Glass>
          </motion.div>
        );
      })}
      <p className="p-1.5 text-center text-13 text-[var(--tx2)]">
        Cards, trump and dealer come straight from the seating order.
      </p>
    </>
  );
}
