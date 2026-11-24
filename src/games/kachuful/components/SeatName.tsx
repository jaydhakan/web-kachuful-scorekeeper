import type { ComponentProps } from 'react';
import { CrownName } from '@/components/crowns/CrownName';
import { useMedals } from '@/games/kachuful/state/medals';

/**
 * A seated player's name with their month's medal, if they hold one (REWARDS-PLAN §6.7). `chase` adds the
 * "On track for 🥇" chip when the game as it stands would give them a better medal.
 */
export function SeatName(props: Omit<ComponentProps<typeof CrownName>, 'crowns'>) {
  return <CrownName {...props} crowns={useMedals()} />;
}
