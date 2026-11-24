import { MedalName } from '@/components/ui/MedalName';
import type { Holder } from '@/progression/medals';
import { medals } from '@/strings/medals';
import type { TableCrowns } from './table';

export interface SeatedMedal {
  name: string;
  h: Holder;
}

/** The seated medallists for the deal's line, gold first (`players` in seat order, ids as the crowns key them). */
export const seatedMedals = (
  players: readonly { id: string; name: string }[],
  held: TableCrowns['held'],
): SeatedMedal[] =>
  players
    .flatMap((p) => {
      const h = held.get(p.id);
      return h ? [{ name: p.name, h }] : [];
    })
    .sort((a, b) => a.h.medal - b.h.medal);

/** Whether the deal has anything to say: a medallist, a rivalry or milestone, or a bounty. */
export const hasDealLine = (
  seated: readonly SeatedMedal[],
  t: Pick<TableCrowns, 'intel' | 'bounty'>,
) => seated.length > 0 || !!t.intel || !!t.bounty;

/**
 * The deal's line (REWARDS-PLAN §6.5, §6.7): one seated medallist gets a line, two or more a "vs"; with no medal at
 * the table, a rivalry or a milestone; and a bounty under a seated Badshah. The caller places and animates it.
 */
export function DealLineText({
  seated,
  intel,
  bounty,
}: {
  seated: readonly SeatedMedal[];
  intel: string | null;
  bounty: string | null;
}) {
  return (
    <>
      {seated.length === 0 ? null : seated.length === 1 ? (
        medals.seated(seated[0].h.medal, seated[0].name)
      ) : (
        <>
          <MedalName name={medals.titled(seated[0].h.medal, seated[0].name)} mark={seated[0].h} />{' '}
          <span className="text-[var(--tx2)]">{medals.vs}</span>{' '}
          <MedalName name={medals.titled(seated[1].h.medal, seated[1].name)} mark={seated[1].h} />
        </>
      )}
      {!seated.length && intel && <span className="block">{intel}</span>}
      {bounty && (
        <span
          data-bounty-line
          className="mt-1 block font-sans text-15 font-semibold text-[var(--gold-tx)]"
        >
          {bounty}
        </span>
      )}
    </>
  );
}
