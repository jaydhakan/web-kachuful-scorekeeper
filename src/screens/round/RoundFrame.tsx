import type { ReactNode } from 'react';
import type { Round } from '@/domain';
import { useApp } from '@/state/store';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { t } from '@/strings';

interface RoundFrameProps {
  r: Round;
  title?: string;
  bar: ReactNode;
  barNote?: ReactNode;
  children: ReactNode;
  navLeft?: ReactNode;
  aside?: ReactNode;
  asideFirst?: boolean;
  fit?: boolean;
}

export function RoundFrame({
  r,
  title,
  bar,
  barNote,
  children,
  navLeft,
  aside,
  asideFirst,
  fit,
}: RoundFrameProps) {
  const { actions } = useApp();
  return (
    <Scaffold
      title={title}
      aside={aside}
      asideFirst={asideFirst}
      fit={fit}
      navTitle={t.round.title(r.index + 1)}
      bar={bar}
      barNote={barNote}
      left={
        navLeft || (
          <IconButton label={t.round.menu} onClick={() => actions.openSheet({ type: 'menu' })}>
            {Icon.menu}
          </IconButton>
        )
      }
      right={
        <IconButton label={t.round.scoreboard} onClick={() => actions.openSheet({ type: 'board' })}>
          {Icon.board}
        </IconButton>
      }
    >
      {children}
    </Scaffold>
  );
}
