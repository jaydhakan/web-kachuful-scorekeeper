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

// The arrow points at the other team: down or up while the teams are stacked, sideways once they sit side by side.
const TOWARD: Record<Team, string> = {
  sun: 'rotate-90 @[40rem]:rotate-0',
  moon: '-rotate-90 @[40rem]:rotate-180',
};

/**
 * Who gives the clues, as a labelled chip around a real radio: filled in the team's colour when on, outlined when it
 * can be chosen, "No account" when it can't. The radio keeps the spoken name ("Kabir gives the clues").
 */
function GiverChip({ p, linked, onPick }: { p: Seated; linked: boolean; onPick: () => void }) {
  const on = p.role === 'clue-giver';
  const look = !linked
    ? 'font-semibold text-[var(--tx2)]'
    : on
      ? `font-bold ${TEAM_FILL[p.team]}`
      : 'mat-fill-s font-bold shadow-[inset_0_0_0_1.5px_var(--hairline-2)]';
  return (
    <label
      className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-15 leading-tight has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${look}`}
    >
      {/* Invisible but covering the chip, so a tap lands on the radio itself. */}
      <input
        type="radio"
        name={`ish-giver-${p.team}`}
        checked={on}
        disabled={!linked}
        onChange={onPick}
        aria-label={su.makeClueGiver(p.name)}
        className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full opacity-0 checked:cursor-default disabled:cursor-default"
      />
      {on && (
        <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
          {Icon.check}
        </span>
      )}
      <span aria-hidden>{!linked ? su.noAccountChip : on ? su.givesClues : su.makeGiver}</span>
    </label>
  );
}

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
  const role = p.role === 'clue-giver' ? su.clueGiver : su.guesser;
  return (
    // The chip drops under the name when both don't fit on one line, so the name keeps its width.
    <li className="flex min-h-14 flex-wrap items-center justify-end gap-x-2 pb-1 pr-2.5">
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={onMove}
        aria-label={su.move(name, role, p.team === 'sun' ? 'moon' : 'sun')}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 rounded-2xl py-1.5 pl-3 text-left"
      >
        <Avatar p={p} className="h-10 w-10 shrink-0 text-20" />
        {/* Breaks only between words, unless one word is wider than the whole row. */}
        <span className="min-w-0 text-17 font-bold leading-tight [overflow-wrap:break-word]">
          {name}
        </span>
        <span
          aria-hidden
          className={`ml-auto shrink-0 text-[var(--tx2)] [&_svg]:h-4 [&_svg]:w-4 ${TOWARD[p.team]}`}
        >
          {Icon.arrow}
        </span>
      </m.button>
      <GiverChip p={p} linked={linked} onPick={onPick} />
    </li>
  );
}

export interface TeamsProps {
  players: Seated[];
  accountOf: AccountOf;
  myPlayerId: string | null;
  onMove: (id: string) => void;
  onPick: (id: string) => void;
  onInvite: (p: Seated) => void;
  onShuffle: () => void;
  onAdd: () => void;
}

/**
 * Setup step 1: Sun and Moon, each with its clue-giver. Stacked while a column can't hold a name beside its chip,
 * side by side once it can. The rest of the step (who can't give clues, Shuffle, Add) is `TeamsSide`.
 */
export function Teams({ players, accountOf, myPlayerId, onMove, onPick }: TeamsProps) {
  // The host who gives clues needs a second device: this screen is the board everyone sees (ISH-F01).
  const hostGives = players.some(
    (p) => p.role === 'clue-giver' && !!myPlayerId && p.playerId === myPlayerId,
  );
  return (
    <div className="@container">
      <m.p {...stagger(0)} className="text-17 leading-snug text-[var(--tx2)]">
        {su.teamsHint}
      </m.p>
      {hostGives && (
        <p
          role="note"
          className="glass mt-3 flex items-start gap-2.5 px-4 py-3 text-16 leading-snug"
        >
          <span aria-hidden className="mt-0.5 shrink-0 [&_svg]:h-5 [&_svg]:w-5">
            {Icon.key}
          </span>
          {su.hostGivesClues}
        </p>
      )}
      <m.div
        {...stagger(1)}
        className="mt-4 grid grid-cols-1 items-start gap-3 @[40rem]:grid-cols-2"
      >
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
                className={`flex min-h-12 items-center gap-2.5 px-4 text-22 font-extrabold ${TEAM_FILL[t]}`}
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
    </div>
  );
}

/** Setup step 1's other half: players who can't give clues (with Invite), Shuffle and Add player. */
export function TeamsSide({ players, accountOf, onInvite, onShuffle, onAdd }: TeamsProps) {
  const unlinked = players.filter((p) => !accountOf(p));
  return (
    <div className="mt-3 pane:mt-0">
      {unlinked.length > 0 && (
        <m.ul {...stagger(2)} className="glass mb-3 overflow-hidden">
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
      <m.div {...stagger(3)} className="grid grid-cols-2 gap-3">
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
    </div>
  );
}
