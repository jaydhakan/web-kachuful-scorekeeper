import { useState, type ReactNode } from 'react';
import { useApp } from '@/games/kachuful/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { MergeKeep, Player } from '@/sync/types';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState, Skeleton } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { authError } from '../AuthPages';
import { ad, adminError, allPlayers, useLoad } from './shared';

type Side = 'a' | 'b';
type Field = 'displayName' | 'email' | 'names' | 'photo';
const F = ad.fields;

const fullName = (p: Player) => [p.firstName, p.lastName].filter(Boolean).join(' ');

async function load(aId: string, bId: string) {
  const [list, a, b] = await Promise.all([allPlayers(), ep.player(aId), ep.player(bId)]);
  const find = (id: string) => list.find((p) => p.id === id);
  const pa = find(aId),
    pb = find(bId);
  if (!pa || !pb) throw new Error(ad.errors.invalid);
  return { a: pa, b: pb, games: { a: a.data.player.games, b: b.data.player.games } };
}

/** One line of the comparison: a choice of two when both have it, else what there is. */
function Line({
  label,
  a,
  b,
  pick,
  onPick,
}: {
  label: string;
  a: ReactNode;
  b: ReactNode;
  pick?: Side;
  onPick?: (s: Side) => void;
}) {
  const cell = (s: Side, v: ReactNode) =>
    onPick ? (
      <button
        type="button"
        aria-pressed={pick === s}
        aria-label={ad.keep(label, typeof v === 'string' ? v : s === 'a' ? '1' : '2')}
        onClick={() => onPick(s)}
        className={`press min-h-12 min-w-0 rounded-2xl px-3 py-2 text-left text-15 font-bold [overflow-wrap:anywhere] ${pick === s ? 'bg-[var(--accent)] text-ink-on-accent' : 'glass'}`}
      >
        {v}
      </button>
    ) : (
      <span className="min-h-12 min-w-0 px-3 py-2 text-15 text-[var(--tx2)] [overflow-wrap:anywhere]">
        {v}
      </span>
    );
  return (
    <div role={onPick ? 'group' : undefined} aria-label={onPick ? label : undefined}>
      <div className="mb-1 text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cell('a', a)}
        {cell('b', b)}
      </div>
    </div>
  );
}

/**
 * Two players side by side: the admin taps what to keep on each line, and one player remains with every game, badge
 * and name. The one with an account (or more games) is kept underneath, which the server needs; the admin's choices
 * decide what it looks like.
 */
export function MergeCompare({
  aId,
  bId,
  onClose,
  onMerged,
}: {
  aId: string;
  bId: string;
  onClose: () => void;
  onMerged: () => void;
}) {
  const { actions } = useApp();
  const [data, reload] = useLoad(() => load(aId, bId));
  const [pick, setPick] = useState<Record<Field, Side>>({
    displayName: 'a',
    email: 'a',
    names: 'a',
    photo: 'a',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const body = (() => {
    if (data instanceof Error) return <ErrorState msg={authError(data)} onRetry={reload} />;
    if (!data) return <Skeleton rows={4} h={56} />;
    const { a, b, games } = data;
    const both = (f: (p: Player) => unknown) => !!f(a) && !!f(b);
    // The server keeps the player with the account (only one may have one); otherwise the one with more games.
    const into: Side = a.linkedUserId ? 'a' : b.linkedUserId ? 'b' : games.a >= games.b ? 'a' : 'b';
    const [from, kept] = into === 'a' ? [b, a] : [a, b];
    const rel = (s: Side): 'from' | 'into' => (s === into ? 'into' : 'from');
    const keep: MergeKeep = {
      displayName: rel(pick.displayName),
      ...(both((p) => p.email) && { email: rel(pick.email) }),
      ...(both(fullName) && { names: rel(pick.names) }),
      ...(both((p) => p.photoUrl) && { photo: rel(pick.photo) }),
    };
    const name = (pick.displayName === 'a' ? a : b).displayName;
    const other = (pick.displayName === 'a' ? b : a).displayName;
    const set = (f: Field) => (s: Side) => setPick({ ...pick, [f]: s });
    const merge = async () => {
      setBusy(true);
      setErr('');
      try {
        await ep.merge(from.id, kept.id, keep);
        actions.say(ad.merged);
        onMerged();
      } catch (x) {
        setBusy(false);
        // Two players who sat at one table are two people.
        setErr(x instanceof ApiError && x.code === 'invalid' ? ad.mergeTogether : adminError(x));
      }
    };
    return (
      <>
        <p className="mb-4 text-15 text-[var(--tx2)]">{ad.mergeHint}</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[a, b].map((p) => (
            <div key={p.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <Avatar p={p} className="grid h-14 w-14 place-items-center rounded-full text-30" />
              <span className="text-17 font-bold [overflow-wrap:anywhere]">{p.displayName}</span>
              {(p.aliases?.length ?? 0) > 0 && (
                <span className="text-13 text-[var(--tx2)]">
                  {ad.otherNames}: {p.aliases!.map((x) => x.displayName).join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Line
            label={F.name}
            a={a.displayName}
            b={b.displayName}
            pick={pick.displayName}
            onPick={set('displayName')}
          />
          <Line
            label={F.email}
            a={a.email ?? ad.nothing}
            b={b.email ?? ad.nothing}
            {...(both((p) => p.email) && { pick: pick.email, onPick: set('email') })}
          />
          <Line
            label={F.names}
            a={fullName(a) || ad.nothing}
            b={fullName(b) || ad.nothing}
            {...(both(fullName) && { pick: pick.names, onPick: set('names') })}
          />
          <Line
            label={F.photo}
            a={a.photoUrl ? ad.photoYes : ad.photoNo}
            b={b.photoUrl ? ad.photoYes : ad.photoNo}
            {...(both((p) => p.photoUrl) && { pick: pick.photo, onPick: set('photo') })}
          />
          <Line label={F.games} a={String(games.a)} b={String(games.b)} />
          <Line
            label={F.account}
            a={a.linkedUserId ? ad.hasAccount : ad.noAccount}
            b={b.linkedUserId ? ad.hasAccount : ad.noAccount}
          />
        </div>
        <p className="mt-5 text-16 font-bold" aria-live="polite">
          {ad.mergeResult(name, games.a + games.b, other)}
        </p>
        <div role="alert" className="mt-2 text-14 font-medium text-[var(--warn)]">
          {err}
        </div>
        <PrimaryButton
          className="mt-3 w-full"
          disabled={busy}
          aria-busy={busy || undefined}
          onClick={() => void merge()}
        >
          {ad.mergeGo}
        </PrimaryButton>
      </>
    );
  })();
  return (
    <Sheet title={ad.mergeTitle} onClose={onClose} full>
      {body}
    </Sheet>
  );
}
