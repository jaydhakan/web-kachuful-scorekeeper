import { useMemo } from 'react';
import { Table, type SeatBadge, type TableProps } from '@/components/ui/Table';
import { useMedals, useSeatMedals } from '@/games/kachuful/state/medals';
import { kursi as k } from '@/strings/kursi';

const CHAIR: Omit<SeatBadge, 'label'> = {
  icon: <span aria-hidden>{k.glyph}</span>,
  style: { background: 'var(--surface-3)', color: 'var(--tx)' },
};

/**
 * The game's table with the month's medallists ringed in their metal and the Kursi's holder badged under their name
 * (REWARDS-PLAN §6.3, §6.7). A screen's own badges win over the chair.
 */
export function GameTable({ badges, ...props }: Omit<TableProps, 'medals'>) {
  const medals = useSeatMedals();
  const seats = useMedals().kursi?.seats;
  const chair = useMemo(
    () => Object.fromEntries((seats ?? []).map((id) => [id, { ...CHAIR, label: k.badge }])),
    [seats],
  );
  return <Table {...props} medals={medals} badges={{ ...chair, ...badges }} />;
}
