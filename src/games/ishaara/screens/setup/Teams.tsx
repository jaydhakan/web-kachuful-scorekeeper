import { m } from 'framer-motion';
import type { Seated, Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { Mark, TEAM_FILL } from '../board/marks';
import { onTeam, TEAMS, type AccountOf } from './teamRules';

const su = s.setup;

// A real radio, drawn as the design's ring: the team's colour inside when picked.
const RADIO: Record<Team, string> = {
  sun: 'checked:bg-team-sun',
  moon: 'checked:bg-team-moon',
};

function Row({
  p,
  me,
  linked,
  onMove,
  onPick,
}: {
  p: Seated;
  me: boolean;
  linked: boolean;
  onMove: () => void;
  onPick: () => void;
}) {
  const name = me ? su.you(p.name) : p.name;
  return (
    <li className="flex min-h-16 items-center gap-1 pr-1">
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={onMove}
        aria-label={su.move(name, p.team === 'sun' ? 'moon' : 'sun')}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 rounded-2xl py-1.5 pl-3 text-left"
      >
        <Avatar p={p} className="h-10 w-10 shrink-0 text-20" />
        <span className="min-w-0">
          <span className="block text-17 font-bold leading-tight [overflow-wrap:anywhere]">
            {name}
          </span>
          <span className="block text-15 leading-tight text-[var(--tx2)]">
            {p.role === 'clue-giver' ? su.clueGiver : su.guesser}
          </span>
        </span>
      </m.button>
      <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center">
        <span className="sr-only">{su.makeClueGiver(p.name)}</span>
        <input
          type="radio"
          name={`ish-giver-${p.team}`}
          checked={p.role === 'clue-giver'}
          disabled={!linked}
          onChange={onPick}
          className={`h-7 w-7 cursor-pointer appearance-none rounded-full bg-word-card shadow-[inset_0_0_0_2px_var(--hairline-2)] checked:shadow-[inset_0_0_0_2px_var(--hairline-2),inset_0_0_0_6px_var(--word-card)] disabled:cursor-default disabled:opacity-35 ${RADIO[p.team]}`}
        />
      </label>
    </li>
  );
}

/** Setup step 1: Sun and Moon side by side, each with its clue-giver; who can't give clues, and Invite. */
export function Teams({
  players,
  accountOf,
  myPlayerId,
  onMove,
  onPick,
  onInvite,
  onShuffle,
  onAdd,
}: {
  players: Seated[];
  accountOf: AccountOf;
  myPlayerId: string | null;
  onMove: (id: string) => void;
  onPick: (id: string) => void;
  onInvite: (p: Seated) => void;
  onShuffle: () => void;
  onAdd: () => void;
}) {
  const unlinked = players.filter((p) => !accountOf(p));
  return (
    <>
      <m.p {...stagger(0)} className="text-17 leading-snug text-[var(--tx2)]">
        {su.teamsHint}
      </m.p>
      <m.div {...stagger(1)} className="mt-4 grid grid-cols-2 gap-3">
        {TEAMS.map((t) => {
          const list = onTeam(players, t);
          return (
            <fieldset
              key={t}
              aria-labelledby={`ish-team-${t}`}
              className="glass min-w-0 overflow-hidden"
            >
              <h2
                id={`ish-team-${t}`}
                className={`flex min-h-14 items-center gap-2.5 px-4 text-22 font-extrabold ${TEAM_FILL[t]}`}
              >
                <Mark id={t} className="h-5 w-5" />
                {s.team[t]}
                <span className="sr-only">· {su.clueGiverOf(t)}</span>
              </h2>
              {list.length === 0 ? (
                <p className="px-4 py-4 text-15 text-[var(--tx2)]">{su.emptyTeam}</p>
              ) : (
                <ul className="py-1">
                  {list.map((p) => (
                    <Row
                      key={p.id}
                      p={p}
                      me={!!myPlayerId && p.playerId === myPlayerId}
                      linked={!!accountOf(p)}
                      onMove={() => onMove(p.id)}
                      onPick={() => onPick(p.id)}
                    />
                  ))}
                </ul>
              )}
            </fieldset>
          );
        })}
      </m.div>
      {unlinked.length > 0 && (
        <m.ul {...stagger(2)} className="glass mt-3 overflow-hidden">
          {unlinked.map((p, k) => (
            <li key={p.id} className="relative flex min-h-[4.5rem] items-center gap-3 px-4 py-3">
              {k > 0 && (
                <span aria-hidden className="absolute left-4 right-4 top-0 h-px bg-ov/10" />
              )}
              <Avatar p={p} className="h-11 w-11 shrink-0 text-22" />
              <span className="min-w-0 flex-1">
                <span className="block text-17 font-bold">{p.name}</span>
                <span className="block text-15 leading-snug text-[var(--tx2)]">{su.noAccount}</span>
              </span>
              <PrimaryButton
                tone="glass"
                onClick={() => onInvite(p)}
                aria-label={su.inviteName(p.name)}
                className="!h-12 shrink-0 px-4 !text-16"
              >
                <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
                  {Icon.user}
                </span>
                {su.invite}
              </PrimaryButton>
            </li>
          ))}
        </m.ul>
      )}
      <m.div {...stagger(3)} className="mt-3 grid grid-cols-2 gap-3">
        <PrimaryButton
          tone="glass"
          onClick={onShuffle}
          disabled={players.length < 2}
          className="!h-14 !text-16"
        >
          <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
            {Icon.dice}
          </span>
          {su.shuffle}
        </PrimaryButton>
        <PrimaryButton tone="glass" onClick={onAdd} className="!h-14 !text-16">
          <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
            {Icon.plus}
          </span>
          {su.addPlayer}
        </PrimaryButton>
      </m.div>
    </>
  );
}
