import { m } from 'framer-motion';
import { useId } from 'react';
import { seatsOf } from '@/games/spades/domain';
import RulesLine from '@/games/spades/ui/RulesLine';
import { spTable } from '@/games/spades/strings/table';
import { SeatingPicker, SeatingTable } from '@/components/seating/SeatingFlow';
import { Dot } from '@/components/ui/Dot';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS } from '@/components/ui/motion';
import { TEAM_TONE, TeamBand } from '../parts';
import { SpSetupFrame, TableSlot } from './SetupFrame';
import { useSpSeating } from './useSpSeating';

const s = spTable.setup;

/** Setup 1: the shared seating flow for four, who partners whom, the last group and the rules line. */
export default function Players() {
  const seating = useSpSeating(),
    { su, actions, tgt, filled } = seating;
  const nextId = useId();
  const lg = su.lg;
  return (
    <SpSetupFrame
      step={1}
      title={s.step1Title}
      bar={
        <PrimaryButton
          id={nextId}
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupStep(2)}
        >
          {s.next}
        </PrimaryButton>
      }
      aside={
        <div className="flex flex-col gap-3 pb-2">
          {lg && filled === 0 && (
            <m.button
              type="button"
              whileTap={PRESS}
              onClick={actions.setupLastGroup}
              className="glass flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
            >
              <span className="flex -space-x-2" aria-hidden>
                {lg.players.map((p) => (
                  <Dot key={p.name} p={p} s={28} />
                ))}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-16 font-bold">{s.lastGroup}</span>
                <span className="truncate text-13 text-[var(--tx2)]">
                  {s.lastGroupBody(lg.players.map((p) => p.name).join(', '))}
                </span>
              </span>
            </m.button>
          )}
          <SeatingPicker
            seating={seating}
            onAdd={() => actions.openSheet({ type: 'addPlayer' })}
            onNeedsEmail={(name) => actions.openSheet({ type: 'addPlayer', name })}
          />
          <div className="glass flex flex-col gap-1.5 px-4 py-3" aria-live="polite">
            <p className="text-13 text-[var(--tx2)]">{s.partnersNote}</p>
            {(['a', 'b'] as const).map((t) => (
              <p key={t} className="flex flex-wrap items-center gap-x-2 text-15">
                <TeamBand t={t} />
                <span className="font-semibold">
                  {seatsOf(t)
                    .map((k) => su.seats[k]?.name ?? s.seatOpen)
                    .join(' & ')}
                </span>
              </p>
            ))}
          </div>
          <RulesLine
            rules={su.rules}
            online={false}
            editable
            onOpen={() => actions.openSheet({ type: 'editRules' })}
          />
        </div>
      }
    >
      <TableSlot players={4}>
        <SeatingTable
          uid="sp-su1"
          seating={seating}
          dir={su.dir}
          nextId={nextId}
          onSeatTap={(k) => actions.openSheet({ type: 'seat', k })}
          center={
            <div className="flex flex-col items-center gap-1 text-13 text-[var(--ctr-fg)]">
              <span className="flex gap-1" aria-hidden>
                <span className={`h-2 w-2 rounded-full ${TEAM_TONE.a.dot}`} />
                <span className={`h-2 w-2 rounded-full ${TEAM_TONE.b.dot}`} />
              </span>
              {s.seated(filled)}
            </div>
          }
        />
      </TableSlot>
    </SpSetupFrame>
  );
}
