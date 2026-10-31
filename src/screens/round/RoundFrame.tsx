import type { ReactNode, RefObject } from 'react';
import type { Round } from '@/domain';
import { useApp } from '@/state/store';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';

interface RoundFrameProps {
  r: Round;
  title?: string;
  bar: ReactNode;
  children: ReactNode;
  navLeft?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement>;
}

export function RoundFrame({ r, title, bar, children, navLeft, scrollRef }: RoundFrameProps) {
  const { actions } = useApp();
  return (
    <Scaffold
      scrollRef={scrollRef}
      title={title}
      navTitle={`Round ${r.index + 1}`}
      bar={bar}
      left={
        navLeft || (
          <IconButton label="Menu" onClick={() => actions.openSheet({ type: 'menu' })}>
            {Icon.menu}
          </IconButton>
        )
      }
      right={
        <IconButton label="Scoreboard" onClick={() => actions.openSheet({ type: 'board' })}>
          {Icon.board}
        </IconButton>
      }
    >
      {children}
    </Scaffold>
  );
}
