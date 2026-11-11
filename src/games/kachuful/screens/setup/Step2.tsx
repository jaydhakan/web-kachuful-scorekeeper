import { useId } from 'react';
import { SeatingPicker, SeatingTable } from '@/components/seating/SeatingFlow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSeatPlayer } from './useSeatPlayer';
import { t } from '@/strings';

/** Seating the table: the shared flow, where seat 1 deals first and seat 2 leads. */
export function Step2() {
  const seating = useSeatPlayer(),
    { su, actions, n, tgt } = seating;
  const nextId = useId();
  return (
    <SetupFrame
      step={2}
      title={t.setup.step2Title}
      fit
      bar={
        <PrimaryButton
          id={nextId}
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupPatch({ step: 3, dealer: 0 })}
        >
          {t.common.next}
        </PrimaryButton>
      }
      aside={
        <SeatingPicker
          seating={seating}
          onAdd={() => actions.openSheet({ type: 'addPlayer' })}
          onNeedsEmail={(name) => actions.openSheet({ type: 'addPlayer', name })}
        />
      }
    >
      <TableSlot players={n}>
        <SeatingTable
          uid="su2"
          seating={seating}
          dir={su.dir}
          badges={{ dealer: 0, first: 1 }}
          nextId={nextId}
          onSeatTap={(k) => actions.openSheet({ type: 'seat', k })}
        />
      </TableSlot>
    </SetupFrame>
  );
}
