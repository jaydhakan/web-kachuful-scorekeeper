import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { IshaaraPublic, Team } from '@/games/ishaara/domain';
import { deleteIshaaraGame, useIshaaraGame } from '@/games/ishaara/state/lists';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { ipg } from '@/games/ishaara/strings/pages';
import { authError } from '@/platform/pages/AuthPages';
import { archive } from '@/state/archive';
import { ApiError } from '@/sync/api';
import { signedInAs, useSession } from '@/sync/session';
import { dayLabel, timeLabel } from '@/lib/dates';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Section, Skeleton } from '@/components/ui/PageParts';
import { ClueLog } from './ClueLog';
import { IshPage, TeamName, useHubNav, WordCard } from './parts';

const gt = ipg.game;
const TEAMS: readonly Team[] = ['sun', 'moon'];

/** One finished game: how it ended, the teams, the whole key and the clue log. Opened from History. */
export function GamePage({ id, summary }: { id: string; summary?: IshaaraSummaryOut }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <GameLoad key={attempt} id={id} summary={summary} retry={() => setAttempt((n) => n + 1)} />
  );
}

function GameLoad({
  id,
  summary,
  retry,
}: {
  id: string;
  summary?: IshaaraSummaryOut;
  retry: () => void;
}) {
  const { game, loading, error } = useIshaaraGame(id);
  if (game && game.status === 'finished' && game.solution)
    return (
      <GameBody
        g={game}
        hostName={summary?.host.name ?? archive.get('ishaaraGames', id)?.hostName ?? null}
      />
    );
  return (
    <IshPage title={gt.title}>
      {loading || (!game && !error) ? (
        <Skeleton rows={4} h={72} />
      ) : error?.status === 404 ? (
        <EmptyState icon="linkBreak" title={gt.notFound} body={gt.notFoundBody} />
      ) : error ? (
        <ErrorState msg={authError(error)} onRetry={retry} />
      ) : (
        <EmptyState icon="hourglass" title={gt.unfinished} body={gt.unfinishedBody} />
      )}
    </IshPage>
  );
}

function GameBody({ g, hostName }: { g: IshaaraPublic; hostName: string | null }) {
  const { open, back } = useHubNav();
  const session = signedInAs(useSession());
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // The list gives only the host's name; the server has the final say and answers 403 to anyone else.
  const canDelete =
    !!session &&
    (session.user.role === 'admin' || (!!hostName && session.player?.displayName === hostName));
  const at = g.finishedAt ?? g.updatedAt;
  const line = ipg.outcome(g.winner, g.endedBy);
  const multi = g.rules.bestOf > 1;
  const remove = () => {
    setAsking(false);
    setBusy(true);
    setFailed(null);
    deleteIshaaraGame(g.id).then(back, (e: unknown) => {
      setBusy(false);
      setFailed(e instanceof ApiError && e.status === 403 ? gt.deleteForbidden : gt.deleteFailed);
    });
  };
  return (
    <>
      <IshPage
        wide
        label={line}
        eyebrow={`${gt.finishedOn(dayLabel(at))} · ${timeLabel(at)}`}
        title={line}
        actions={
          canDelete && (
            <IconButton chrome label={gt.delete} onClick={() => !busy && setAsking(true)}>
              {Icon.trash}
            </IconButton>
          )
        }
      >
        {multi && (
          <p className="mb-4 text-15 font-bold text-[var(--tx2)]">
            {ipg.match(g.match.game, g.match.sunWins, g.match.moonWins)}
          </p>
        )}
        {failed && (
          <p role="alert" className="glass mb-4 p-4 text-15 text-[var(--danger)]">
            {failed}
          </p>
        )}
        <Section title={gt.teams}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 [[data-desk]_&]:grid-cols-2">
            {TEAMS.map((t) => (
              <div key={t} className="glass p-2">
                <h3 className="px-2 pb-1 pt-1 text-15 font-bold">
                  <TeamName team={t} />
                </h3>
                <ul>
                  {g.players
                    .filter((p) => p.team === t)
                    .map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={!p.playerId}
                          aria-label={gt.openPlayer(p.name)}
                          onClick={() =>
                            p.playerId &&
                            open({
                              page: 'player',
                              who: {
                                id: p.playerId,
                                playerId: p.playerId,
                                name: p.name,
                                emoji: p.emoji,
                                color: p.color,
                              },
                            })
                          }
                          className="press flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-1 text-left"
                        >
                          <Avatar
                            p={p}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
                          />
                          <span className="min-w-0 flex-1 text-16 font-bold [overflow-wrap:anywhere]">
                            {p.name}
                          </span>
                          {p.role === 'clue-giver' && (
                            <span className="rounded-full bg-ov/[.08] px-2 py-0.5 text-13 font-bold text-[var(--tx2)]">
                              {ipg.common.clueGiver}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
        <Section
          title={gt.key}
          aside={<span className="text-13 text-[var(--tx2)]">{gt.keyNote}</span>}
        >
          <ul aria-label={gt.key} className="grid grid-cols-5 gap-1.5">
            {g.words.map((w, i) => (
              <li key={i}>
                <WordCard word={w} id={g.solution![i]} picked={g.revealed[i] !== null} small />
              </li>
            ))}
          </ul>
        </Section>
        <Section title={gt.log}>
          <ClueLog game={g} />
        </Section>
      </IshPage>
      <AnimatePresence>
        {asking && (
          <Modal
            text={gt.confirm}
            body={gt.confirmBody}
            ok={ipg.common.delete}
            danger
            onOk={remove}
            onCancel={() => setAsking(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
