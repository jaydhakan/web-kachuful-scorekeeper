import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { agoTxt } from '@/lib/format';
import { ep } from '@/sync/endpoints';
import type { PlayerSummary } from '@/sync/types';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState, Section, Skeleton } from '@/components/ui/Page';
import { StatTile, TileGrid } from '@/components/ui/Stats';
import { stagger } from '@/components/ui/stagger';
import { icon } from '@/components/ui/IconsMore';
import { authError } from '../AuthPages';
import { ad, Chevron, useLoad } from './shared';

const DAY = 864e5;

/** One thing to look at, and the button that goes to where it is fixed. */
function Item({
  lead,
  title,
  sub,
  action,
  onClick,
  i,
}: {
  lead: ReactNode;
  title: string;
  sub?: string;
  action: string;
  onClick: () => void;
  i: number;
}) {
  return (
    <m.li {...stagger(Math.min(i, 8))}>
      <button
        type="button"
        onClick={onClick}
        className="press glass flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
      >
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block text-16 font-bold [overflow-wrap:anywhere]">{title}</span>
          {sub && <span className="block text-13 text-[var(--tx2)]">{sub}</span>}
        </span>
        <span className="shrink-0 text-14 font-bold text-[var(--accent-tx)]">{action}</span>
        <Chevron />
      </button>
    </m.li>
  );
}

const Pair = ({ a, b }: { a: PlayerSummary; b: PlayerSummary }) => (
  <span aria-hidden className="flex shrink-0 -space-x-3">
    {[a, b].map((p) => (
      <Avatar
        key={p.id}
        p={p}
        className="grid h-10 w-10 place-items-center rounded-full text-20 shadow-[0_0_0_2px_var(--bg)]"
      />
    ))}
  </span>
);

const Badge = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden
    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ov/[.07] text-20"
  >
    {children}
  </span>
);

/** The counts, then what needs the admin, each linking to where it is fixed. */
export function Overview({
  onPeople,
  onCompare,
}: {
  onPeople: () => void;
  onCompare: (a: PlayerSummary, b: PlayerSummary) => void;
}) {
  const [o, reload] = useLoad(ep.overview);
  if (o instanceof Error) return <ErrorState msg={authError(o)} onRetry={reload} />;
  if (!o) return <Skeleton rows={3} h={88} />;
  const c = ad.counts;
  const att = o.attention;
  const backupStale = !o.lastBackupAt || Date.now() - o.lastBackupAt > 2 * DAY;
  let i = 0;
  const items = [
    ...(att && att.invitesExpiringSoon > 0
      ? [
          <Item
            key="inv"
            i={i++}
            lead={<Badge>{icon('envelope')}</Badge>}
            title={ad.invitesSoon(att.invitesExpiringSoon)}
            action={ad.seePeople}
            onClick={onPeople}
          />,
        ]
      : []),
    ...(att?.possibleDuplicates ?? []).map((d) => (
      <Item
        key={d.a.id + d.b.id}
        i={i++}
        lead={<Pair a={d.a} b={d.b} />}
        title={ad.maybeSame(d.a.displayName, d.b.displayName)}
        sub={d.reason === 'email' ? ad.sameEmail : ad.similarName}
        action={ad.compare}
        onClick={() => onCompare(d.a, d.b)}
      />
    )),
  ];
  return (
    <>
      <Section title={ad.attention}>
        {items.length > 0 || backupStale ? (
          <ul className="flex flex-col gap-2">
            {items}
            {backupStale && (
              <li className="glass flex min-h-16 items-center gap-3 px-4 py-2">
                <Badge>{icon('shield')}</Badge>
                <span className="text-16 font-bold">
                  {o.lastBackupAt ? ad.backupOld(agoTxt(o.lastBackupAt)) : ad.backupNone}
                </span>
              </li>
            )}
          </ul>
        ) : (
          <p className="glass flex min-h-16 items-center gap-3 px-4 py-2 text-16 font-bold">
            <Badge>✓</Badge>
            {ad.allClear}
          </p>
        )}
      </Section>
      <Section title={ad.overview}>
        <TileGrid>
          <StatTile label={c.users} value={o.users} />
          <StatTile label={c.players} value={o.players} />
          <StatTile label={c.games} value={o.games} />
          <StatTile label={c.rounds} value={o.rounds} />
          <StatTile
            label={c.backup}
            value={o.lastBackupAt ? agoTxt(o.lastBackupAt) : ad.noBackup}
          />
        </TileGrid>
      </Section>
    </>
  );
}
