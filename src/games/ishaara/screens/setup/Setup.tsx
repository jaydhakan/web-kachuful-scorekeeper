import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Seated } from '@/games/ishaara/domain';
import { reasonOf } from '@/games/ishaara/sync/endpoints';
import { useIshaara } from '@/games/ishaara/state/store';
import { cleanCustom, dealWords } from '@/games/ishaara/state/words';
import { table as s } from '@/games/ishaara/strings/table';
import { uuid } from '@/lib/ids';
import type { Seat } from '@/people';
import { archive } from '@/state/archive';
import { ensurePlayer, resolveId } from '@/state/registry';
import { ApiError } from '@/sync/api';
import { pullPlayers, pushPlayers } from '@/sync/players';
import { signedInAs, useSession } from '@/sync/session';
import { SetupFrame } from '@/components/seating/SetupFrame';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InviteSheet } from './InviteSheet';
import { PlayersSheet } from './PlayersSheet';
import {
  fixClueGivers,
  moveSeat,
  pickClueGiver,
  shuffleTeams,
  teamsProblem,
  type AccountOf,
} from './teamRules';
import { Teams } from './Teams';
import { useAccountOf, useDraft, splitCustom, type Draft } from './useDraft';
import { WordsRules } from './WordsRules';

const su = s.setup;

/** Why Start can't be pressed on step 2, or null. */
export function wordsProblem(d: Pick<Draft, 'packs' | 'custom'>): string | null {
  return d.packs.length || cleanCustom(splitCustom(d.custom)).length >= 25 ? null : su.why.noPacks;
}

/** New players go up to the server first (the game names every seat by its server id); null if any couldn't. */
async function serverSeats(players: Seated[]): Promise<Seated[] | null> {
  const moved: Record<string, string> = {};
  await pushPlayers((m) => Object.assign(moved, m));
  const out = players.map((p) => ({
    ...p,
    playerId: resolveId(moved[p.playerId!] ?? p.playerId!),
  }));
  return out.some((p) => archive.get('players', p.playerId)?.local) ? null : out;
}

function startError(e: unknown): string {
  if (e instanceof RangeError) return su.errors.words;
  if (!(e instanceof ApiError)) return su.errors.generic;
  if (e.offline) return su.errors.offline;
  if (e.code === 'unknown_player') return su.errors.players;
  if (reasonOf(e) === 'clue-giver-account') return su.errors.clueGiverAccount;
  return su.errors.generic;
}

/** Setup's two steps on the table: teams with their clue-givers, then words and rules; Start creates the game. */
export default function Setup() {
  const { actions } = useIshaara();
  const session = signedInAs(useSession());
  const accountOf: AccountOf = useAccountOf(session);
  const { draft, setDraft, patch } = useDraft(session);
  const [step, setStep] = useState<1 | 2>(1);
  const [sheet, setSheet] = useState<'players' | Seated | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Who is linked to an account may have changed since this device last looked (an invite accepted).
  useEffect(() => {
    if (session) pullPlayers().catch(() => undefined);
  }, [session]);
  // A clue-giver who lost their link (or a team that just gained one) is settled as the registry changes.
  useEffect(() => {
    setDraft((d) => {
      const players = fixClueGivers(d.players, accountOf);
      return players.every((p, i) => p === d.players[i]) ? d : { ...d, players };
    });
  }, [accountOf, setDraft]);

  const players = draft.players;
  const setPlayers = (f: (p: Seated[]) => Seated[]) =>
    setDraft((d) => ({ ...d, players: f(d.players) }));
  const add = (seat: Seat, team: Seated['team']) => {
    const rec = ensurePlayer(seat, true);
    setPlayers((ps) =>
      fixClueGivers(
        [
          ...ps,
          {
            id: uuid(),
            name: seat.name,
            emoji: seat.emoji,
            color: seat.color,
            playerId: rec.id,
            team,
            role: 'guesser',
          },
        ],
        accountOf,
      ),
    );
  };

  const start = async () => {
    setBusy(true);
    setErr('');
    try {
      const seats = await serverSeats(players);
      if (!seats) throw new ApiError(409, 'unknown_player');
      const customWords = cleanCustom(splitCustom(draft.custom));
      const words = await dealWords(draft.packs, customWords);
      const r = await actions.startGame({
        players: seats,
        words,
        rules: { ...draft.rules, packs: draft.packs },
        customWords,
      });
      if (!r.ok) setErr(startError(r.error));
    } catch (e) {
      setErr(startError(e));
    }
    setBusy(false);
  };

  const why = step === 1 ? teamsProblem(players, accountOf) : wordsProblem(draft);
  return (
    <>
      <SetupFrame
        step={step}
        title={step === 1 ? su.teamsTitle : su.wordsTitle}
        onBack={() => (step === 1 ? actions.go('home') : setStep(1))}
        backLabel={su.back}
        stepLabel={su.stepOf(step)}
        dotId="ish-step-dot"
        bar={
          <div className="flex w-full flex-col gap-2">
            {(why || err) && (
              <p role={err ? 'alert' : 'status'} className="text-15 font-medium text-[var(--warn)]">
                {err || why}
              </p>
            )}
            <PrimaryButton
              className="w-full"
              disabled={!!why || busy}
              aria-busy={busy || undefined}
              onClick={() => (step === 1 ? setStep(2) : void start())}
            >
              {step === 1 ? su.nextWords : busy ? su.starting : su.start}
            </PrimaryButton>
          </div>
        }
      >
        {step === 1 ? (
          <Teams
            players={players}
            accountOf={accountOf}
            myPlayerId={session?.user.playerId ?? null}
            onMove={(id) => setPlayers((ps) => moveSeat(ps, id, accountOf))}
            onPick={(id) => setPlayers((ps) => pickClueGiver(ps, id, accountOf))}
            onInvite={(p) => setSheet(p)}
            onShuffle={() => setPlayers((ps) => shuffleTeams(ps, accountOf))}
            onAdd={() => setSheet('players')}
          />
        ) : (
          <WordsRules draft={draft} patch={patch} />
        )}
      </SetupFrame>
      <AnimatePresence>
        {sheet === 'players' && (
          <PlayersSheet
            key="players"
            players={players}
            session={session}
            onAdd={add}
            onRemove={(id) =>
              setPlayers((ps) =>
                fixClueGivers(
                  ps.filter((p) => p.id !== id),
                  accountOf,
                ),
              )
            }
            onClose={() => setSheet(null)}
          />
        )}
        {sheet && sheet !== 'players' && (
          <InviteSheet
            key="invite"
            p={sheet}
            admin={session?.user.role === 'admin'}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
