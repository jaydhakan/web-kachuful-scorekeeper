import { Table, type TableProps } from '@/components/ui/Table';
import { useSeatMedals } from '@/games/kachuful/state/medals';

/** The game's table with the month's medallists ringed in their metal (REWARDS-PLAN §6.7). */
export function GameTable(props: Omit<TableProps, 'medals'>) {
  return <Table {...props} medals={useSeatMedals()} />;
}
