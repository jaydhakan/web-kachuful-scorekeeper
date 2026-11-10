import { useCallback, useMemo, useState } from 'react';
import { MAX_PLAYERS, type Seated, type Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { useHaptics } from '@/hooks/useHaptics';
import { COLORS, EMOJIS, type Seat } from '@/people';
import type { Session } from '@/state/persistence';
import { AddPlayerForm } from '@/components/seating/AddPlayerForm';
import { useSeating } from '@/components/seating/useSeating';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { Mark } from '../board/marks';
import { smallerTeam } from './teamRules';

const su = s.setup;

/**
 * Adds players with the shared seating form (people you know, or a new name and email) and removes them. Each new
 * player joins the smaller team; the teams screen moves them.
 */
export function PlayersSheet({
  players,
  session,
  onAdd,
  onRemove,
  onClose,
}: {
  players: Seated[];
  session: Session | null;
  onAdd: (seat: Seat, team: Team) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const vib = useHaptics();
  const [msg, setMsg] = useState('');
  const full = players.length >= MAX_PLAYERS;
  // One empty seat after everyone seated, so the shared form always has the next one to fill.
  const seats = useMemo<(Seat | null)[]>(
    () => [...players, ...(full ? [] : [null])],
    [players, full],
  );
  const team = smallerTeam(players);
  const seating = useSeating({
    seats,
    n: seats.length,
    dir: 'cw',
    session,
    firstPrompt: su.addTo(team),
    onSeat: (k, seat) =>
      onAdd(
        {
          ...seat,
          emoji: seat.emoji ?? EMOJIS[k % EMOJIS.length],
          color: seat.color ?? COLORS[k % COLORS.length],
        },
        team,
      ),
  });
  const close = useCallback(() => onClose(), [onClose]);
  return (
    <Sheet title={su.players} onClose={onClose} full>
      {full ? (
        <p className="text-17 font-semibold text-[var(--tx2)]">{su.why.tooMany(MAX_PLAYERS)}</p>
      ) : (
        <AddPlayerForm
          seating={{ ...seating, prompt: su.addTo(team) }}
          onClose={close}
          say={setMsg}
          vib={vib}
        />
      )}
      <p role="status" className="mt-2 text-14 text-[var(--tx2)]">
        {msg}
      </p>
      {players.length > 0 && (
        <section aria-labelledby="ish-seated" className="mt-6">
          <h3 id="ish-seated" className="mono-label mb-1 px-2 text-13 text-[var(--tx2)]">
            {su.atTable}
          </h3>
          <ul className="glass overflow-hidden">
            {players.map((p, k) => (
              <li key={p.id} className="relative flex min-h-14 items-center gap-3 pl-4 pr-1">
                {k > 0 && (
                  <span aria-hidden className="absolute left-4 right-4 top-0 h-px bg-ov/10" />
                )}
                <Avatar p={p} className="h-9 w-9 shrink-0 text-18" />
                <span className="min-w-0 flex-1 text-17 font-semibold">{p.name}</span>
                <span className="flex items-center gap-1.5 text-15 text-[var(--tx2)]">
                  <Mark id={p.team} className="h-3 w-3" />
                  {s.team[p.team]}
                </span>
                <IconButton label={su.remove(p.name)} onClick={() => onRemove(p.id)}>
                  {Icon.close}
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
