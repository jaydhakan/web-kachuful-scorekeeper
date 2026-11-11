import { m } from 'framer-motion';
import type { Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { MenuButton, MenuRow } from '@/components/ui/MenuRows';
import { Sheet } from '@/components/ui/Sheet';
import { stagger } from '@/components/ui/stagger';

const b = s.board;

/** The board's menu: how to play, back to games (the game keeps going), and resigning for either team. */
export function BoardMenu({
  onClose,
  onRules,
  onLeave,
  onResign,
  canResign,
}: {
  onClose: () => void;
  onRules: () => void;
  onLeave: () => void;
  onResign: (t: Team) => void;
  canResign: boolean;
}) {
  return (
    <Sheet title={b.menu} onClose={onClose}>
      <MenuRow i={0} icon={Icon.rules} label={b.rules} onClick={onRules} rule={false} />
      <MenuRow i={1} icon={Icon.cards} label={b.leave} onClick={onLeave} rule />
      <m.p {...stagger(2)} className="px-2 pb-3 pt-1 text-14 text-[var(--tx2)]">
        {b.leaveNote}
      </m.p>
      <m.div {...stagger(3)} className="grid grid-cols-2 gap-2">
        {(['sun', 'moon'] as const).map((t) => (
          <MenuButton
            key={t}
            icon={Icon.flag}
            label={b.resign(t)}
            neg
            disabled={!canResign}
            onClick={() => onResign(t)}
          />
        ))}
      </m.div>
    </Sheet>
  );
}
