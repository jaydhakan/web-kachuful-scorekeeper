import { useId } from 'react';
import { SeatingPicker, SeatingTable } from '@/components/seating/SeatingFlow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useKtSeating } from './useKtSeating';

/** Setup 2: the shared seating flow; the dealer's chip and "Bids 1st" on the seat after it. */
export default function Seating() {
  const seating = useKtSeating(),
    { su, actions, n, tgt } = seating;
  const nextId = useId();
  return (
    <SetupFrame
      step={2}
      title={s.step2Title}
      bar={
        <PrimaryButton
          id={nextId}
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupStep(3)}
        >
          {s.next}
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
          uid="kt-su2"
          seating={seating}
          dir={su.dir}
          badges={{ dealer: su.dealer, first: (su.dealer + 1) % n, firstLabel: s.bidsFirst }}
          nextId={nextId}
          onSeatTap={(k) => actions.openSheet({ type: 'seat', k })}
        />
      </TableSlot>
    </SetupFrame>
  );
}
