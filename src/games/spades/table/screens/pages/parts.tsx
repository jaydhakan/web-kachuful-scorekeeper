import type { ReactNode } from 'react';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { EmptyState, PageFrame, Skeleton, type PageProps } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { SpGames } from './source';

const p = spTable.pages;

/** Leaves a page opened from the address: back where it came from, or to Spades' home when it was the first. */
export const leavePage = () => (history.length > 1 ? history.back() : spGo('', { replace: true }));

/** A scorekeeper page in the shared frame; Back closes the top recap, else leaves the page. */
export function SpPage(props: Omit<PageProps, 'onBack'>) {
  const { state, actions } = useSp();
  return <PageFrame onBack={state.pages.length ? actions.closePage : leavePage} {...props} />;
}

/** Loading and unreadable-archive states shared by the pages; children render once the games are in. */
export function Gate({ src, children }: { src: SpGames; children: () => ReactNode }) {
  if (src.status === 'loading') return <Skeleton rows={5} h={72} />;
  if (src.status === 'error')
    return <EmptyState icon="warn" title={p.unavailableTitle} body={p.unavailableBody} />;
  return <>{children()}</>;
}

/** No games at all: says so and offers the scorekeeper. */
export function NoGames({ title, body }: { title: string; body: string }) {
  const { actions } = useSp();
  return (
    <EmptyState
      card
      icon="cards"
      title={title}
      body={body}
      action={
        <PrimaryButton
          className="w-56"
          onClick={() => {
            actions.startSetup();
            spGo('?keep');
          }}
        >
          {p.newGame}
        </PrimaryButton>
      }
    />
  );
}
