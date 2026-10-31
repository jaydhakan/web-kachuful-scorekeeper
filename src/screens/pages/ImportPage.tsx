import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { doneRounds, emailKey, emailOk, nameKey, NAME_MAX, tidyName } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { archive, type PlayerRec } from '@/state/archive';
import { idOf } from '@/state/registry';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { importable, importGames, markImportAsked } from '@/sync/engine';
import type { PlayerCheck, PlayerSummary } from '@/sync/types';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack, EmptyState, Page, Section } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { stagger } from '@/components/ui/stagger';
import { gameLine } from './HistoryPage';
import { t } from '@/strings';

const x = t.hub.sync2;

type Check = PlayerCheck['status'] | 'idle' | 'checking' | 'error';
interface Row {
  name: string;
  email: string;
  check: Check;
  match: PlayerSummary | null;
  /** The person's answer to "Is this Riya?". */
  same: boolean | null;
}

/**
 * First sign-in: choose games scored here to add to the account, then give each of their players a name and email.
 * Name and email of one server player is that player (once confirmed); a taken name or email reveals nobody.
 */
export function ImportPage() {
  const { actions } = useApp();
  const games = useArchive(() => importable());
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [step, setStep] = useState<'games' | 'players'>('games');
  const chosen = useMemo(() => picked ?? new Set(games.map((g) => g.syncId)), [picked, games]);
  // This phone's own players in the chosen games.
  const people = useMemo(() => {
    const ids = new Set<string>();
    for (const g of games)
      if (chosen.has(g.syncId)) for (const p of g.game.players) ids.add(idOf(p));
    return [...ids]
      .map((id) => archive.get('players', id))
      .filter((p) => p && p.local) as PlayerRec[];
  }, [games, chosen]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const row = (p: PlayerRec): Row =>
    rows[p.id] ?? {
      name: p.displayName,
      email: p.email ?? '',
      check: 'idle',
      match: null,
      same: null,
    };
  const edit = (p: PlayerRec, patch: Partial<Row>) =>
    setRows((r) => ({
      ...r,
      [p.id]: { ...row(p), ...patch, check: 'idle', match: null, same: null },
    }));
  if (!games.length)
    return (
      <Page title={x.importTitle}>
        <EmptyState icon="✅" title={x.none} body={x.noneBody} />
      </Page>
    );
  const checkAll = async () => {
    for (const p of people) {
      const r = row(p);
      if (r.check !== 'idle' || !emailOk(r.email) || !nameKey(r.name)) continue;
      setRows((all) => ({ ...all, [p.id]: { ...r, check: 'checking' } }));
      try {
        const c = await ep.checkPlayer(tidyName(r.name), emailKey(r.email));
        setRows((all) => ({ ...all, [p.id]: { ...r, check: c.status, match: c.player } }));
      } catch (e) {
        // Offline: the server decides when the player uploads; a clash then lands in the inbox.
        const offline = e instanceof ApiError && e.offline;
        setRows((all) => ({ ...all, [p.id]: { ...r, check: offline ? 'new' : 'error' } }));
      }
    }
  };
  const settled = (r: Row) => r.check === 'new' || (r.check === 'match' && r.same !== null);
  const finish = () => {
    const matches: Record<string, string | null> = {};
    for (const p of people) {
      const r = row(p);
      if (r.check === 'match' && r.same && r.match) matches[p.id] = r.match.id;
      else {
        archive.put('players', {
          ...p,
          displayName: tidyName(r.name),
          nameKey: nameKey(r.name),
          email: emailKey(r.email),
        });
        matches[p.id] = null;
      }
    }
    importGames([...chosen], matches);
    actions.back();
    actions.say(x.added(chosen.size));
  };
  const toggle = (id: string) => {
    const n = new Set(chosen);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };
  if (step === 'players') {
    const all = people.map(row);
    const ready = all.every(settled);
    const checkable = all.some((r) => r.check === 'idle' && emailOk(r.email) && nameKey(r.name));
    return (
      <Page title={x.matchTitle}>
        <p className="mb-5 text-15 text-[var(--tx2)]">{x.matchBody}</p>
        <ul className="flex flex-col gap-3">
          {people.map((p, i) => {
            const r = row(p);
            return (
              <motion.li key={p.id} {...stagger(i)} className="glass p-4">
                <div className="mb-2 flex items-center gap-3">
                  <Avatar p={p} />
                  <span className="flex-1 text-17 font-bold">{p.displayName}</span>
                  {r.check === 'new' && (
                    <span className="text-13 text-[var(--tx2)]">{x.newOne}</span>
                  )}
                </div>
                {r.check === 'match' && r.match ? (
                  <SameChoice
                    r={r}
                    onPick={(same) => setRows((a) => ({ ...a, [p.id]: { ...r, same } }))}
                    onRecheck={() => edit(p, { email: '' })}
                  />
                ) : (
                  <>
                    <Field
                      label={x.renameTo}
                      value={r.name}
                      maxLength={NAME_MAX}
                      onChange={(v) => edit(p, { name: v })}
                      error={r.check === 'name_taken' ? x.nameTaken(tidyName(r.name)) : ''}
                    />
                    <Field
                      label={x.emailFor(r.name || p.displayName)}
                      type="email"
                      inputMode="email"
                      autoCapitalize="off"
                      value={r.email}
                      onChange={(v) => edit(p, { email: v })}
                      hint={x.emailHint}
                      error={
                        r.check === 'email_taken'
                          ? x.emailTaken
                          : r.check === 'error'
                            ? t.hub.auth.errors.server
                            : r.email && !emailOk(r.email)
                              ? x.emailInvalid
                              : ''
                      }
                    />
                  </>
                )}
              </motion.li>
            );
          })}
        </ul>
        {ready ? (
          <PrimaryButton className="mt-5 w-full" onClick={finish}>
            {x.add(chosen.size)}
          </PrimaryButton>
        ) : (
          <PrimaryButton className="mt-5 w-full" disabled={!checkable} onClick={checkAll}>
            {all.some((r) => r.check === 'checking') ? t.hub.auth.busy : x.checkPlayers}
          </PrimaryButton>
        )}
      </Page>
    );
  }
  return (
    <Page title={x.importTitle}>
      <p className="mb-5 text-18 font-bold">{x.importAsk(games.length)}</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <PrimaryButton
          className="px-6"
          onClick={() => (people.length ? setStep('players') : finish())}
        >
          {choosing ? x.next : x.addAll}
        </PrimaryButton>
        {!choosing && (
          <PrimaryButton tone="glass" className="px-6" onClick={() => setChoosing(true)}>
            {x.choose}
          </PrimaryButton>
        )}
        <PrimaryButton
          tone="glass"
          className="px-6"
          onClick={() => (markImportAsked(), actions.back())}
        >
          {x.notNow}
        </PrimaryButton>
      </div>
      <Section>
        <ul className="flex flex-col gap-2">
          {games.map((r) => (
            <li key={r.syncId}>
              <label className="glass flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2">
                {choosing && (
                  <input
                    type="checkbox"
                    checked={chosen.has(r.syncId)}
                    onChange={() => toggle(r.syncId)}
                    className="h-6 w-6 accent-[var(--accent)]"
                  />
                )}
                <AvatarStack players={r.game.players} />
                <span className="min-w-0 flex-1">
                  <span className="block text-15 font-bold">{gameLine(r.game)}</span>
                  <span className="block text-13 text-[var(--tx2)]">
                    {dayLabel(r.endedAt ?? r.updatedAt)} ·{' '}
                    {t.hub.history.rounds(doneRounds(r.game).length)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}

/** "Is this Riya?" for a player whose name and email both matched; no means checking the email again. */
function SameChoice({
  r,
  onPick,
  onRecheck,
}: {
  r: Row;
  onPick: (same: boolean) => void;
  onRecheck: () => void;
}) {
  const m = r.match!;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Avatar p={m} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-20" />
        <span className="text-15">
          <span className="block font-bold">{x.isThis(m.displayName)}</span>
          <span className="block text-13 text-[var(--tx2)]">
            {t.hub.auth.games(m.games, m.createdByName || '—')}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={r.same === true}
          onClick={() => onPick(true)}
          className={`min-h-11 rounded-xl px-3 text-14 font-bold ${r.same ? 'bg-[var(--accent)] text-ink-on-accent' : 'glass'}`}
        >
          {x.yes}
        </button>
        <button
          type="button"
          onClick={onRecheck}
          className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
        >
          {x.recheck}
        </button>
      </div>
    </div>
  );
}
