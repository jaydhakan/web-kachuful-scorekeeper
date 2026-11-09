import { useMemo, type ReactNode } from 'react';
import { doneHands, roster, standings, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { archive } from '@/state/archive';
import { resolveId } from '@/state/registry';
import { useArchiveVersion } from '@/state/useArchive';
import { EmptyState, PageFrame, Skeleton, type PageProps } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { KtGames } from './source';

/** A Kaali Teeri page: the shared frame, Back closing the top page. Fills whatever box hosts it (phone or desk). */
export function KtPage(props: Omit<PageProps, 'onBack'>) {
  const { actions } = useKt();
  return <PageFrame onBack={actions.closePage} {...props} />;
}

/** How a player is drawn: the registry's current look, else their latest seat, else the key itself. */
export interface Who {
  id: string;
  playerId?: string;
  name: string;
  emoji: string;
  color: string;
}

export function useWho(games: KtGame[]): (key: string) => Who {
  const v = useArchiveVersion();
  const seats = useMemo(() => new Map(roster(games).map((r) => [r.playerId, r.player])), [games]);
  return useMemo(() => {
    const cache = new Map<string, Who>();
    return (key: string) => {
      let w = cache.get(key);
      if (w) return w;
      const reg = key.startsWith('name:') ? undefined : archive.get('players', resolveId(key));
      const seat = seats.get(key);
      w = reg
        ? { id: key, playerId: reg.id, name: reg.displayName, emoji: reg.emoji, color: reg.color }
        : seat
          ? {
              id: key,
              playerId: seat.playerId,
              name: seat.name,
              emoji: seat.emoji,
              color: seat.color,
            }
          : { id: key, name: key.replace(/^name:/, ''), emoji: '🙂', color: 'var(--tx2)' };
      cache.set(key, w);
      return w;
    };
    // The registry is read, and the cache rebuilt, once per archive version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, v]);
}

/** One line on how a game stands: who won or tied, who leads, or that nothing is scored yet. */
export function gameLine(g: KtGame): string {
  const l = kpg.line;
  if (!doneHands(g).length) return l.noHands;
  const top = standings(g).filter((s) => s.rank === 1);
  if (g.status !== 'finished') return l.leads(top[0].p.name, top[0].t);
  return top.length === 1
    ? l.won(top[0].p.name, top[0].t)
    : l.tied(
        top.map((s) => s.p.name),
        top[0].t,
      );
}

/** Loading and unreadable-archive states shared by every page; children render once the games are in. */
export function Gate({
  src,
  rows = 4,
  children,
}: {
  src: KtGames;
  rows?: number;
  children: () => ReactNode;
}) {
  if (src.status === 'loading') return <Skeleton rows={rows} h={72} />;
  if (src.status === 'error')
    return (
      <EmptyState
        icon="warn"
        title={kpg.common.unavailableTitle}
        body={kpg.common.unavailableBody}
      />
    );
  return <>{children()}</>;
}

/** No games at all: says so and offers a new one. */
export function NoGames({ title, body }: { title: string; body: string }) {
  const { actions } = useKt();
  return (
    <EmptyState
      card
      icon="cards"
      title={title}
      body={body}
      action={
        <PrimaryButton className="w-56" onClick={actions.startSetup}>
          {kpg.common.newGame}
        </PrimaryButton>
      }
    />
  );
}

/** A number with what it is; `sub` adds context under it. */
export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="glass flex min-h-[5.5rem] flex-col justify-between gap-1 p-3.5">
      <div className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">{label}</div>
      <div className="disp text-28 font-extrabold leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      {sub && <div className="text-13 text-[var(--tx2)]">{sub}</div>}
    </div>
  );
}

export const Tiles = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 land:grid-cols-3 wide:grid-cols-3 [[data-desk]_&]:grid-cols-4">
    {children}
  </div>
);

/** A full-width row that opens something. */
export function RowButton({
  label,
  onClick,
  children,
}: {
  label?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
    >
      {children}
    </button>
  );
}
