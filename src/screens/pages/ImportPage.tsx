import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { doneRounds, emailKey, emailOk, nameKey, suggestName } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { archive } from '@/state/archive';
import { idOf, livePlayers } from '@/state/registry';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { importable, importGames, markImportAsked } from '@/sync/engine';
import { AvatarStack, EmptyState, Page, Section } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { stagger } from '@/components/ui/stagger';
import { gameLine } from './HistoryPage';
import { t } from '@/strings';

const x = t.hub.sync2;

/** First sign-in: choose games scored here to add to the account, then match their players to the server's. */
export function ImportPage() {
  const { actions } = useApp();
  const games = useArchive(() => importable());
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [step, setStep] = useState<'games' | 'players'>('games');
  const chosen = useMemo(() => picked ?? new Set(games.map((g) => g.syncId)), [picked, games]);
  // This phone's own players in the chosen games, and the server player with the same name, if any.
  const people = useMemo(() => {
    const ids = new Set<string>();
    for (const g of games)
      if (chosen.has(g.syncId)) for (const p of g.game.players) ids.add(idOf(p));
    const server = livePlayers().filter((p) => !p.local);
    return [...ids]
      .map((id) => archive.get('players', id))
      .filter((p) => p && p.local)
      .map((p) => ({ p: p!, match: server.find((s) => s.nameKey === p!.nameKey) ?? null }));
  }, [games, chosen]);
  const [same, setSame] = useState<Record<string, boolean>>({});
  const [rename, setRename] = useState<Record<string, string>>({});
  // A player new to the server needs an email; it tells people apart.
  const [emails, setEmails] = useState<Record<string, string>>({});
  if (!games.length)
    return (
      <Page title={x.importTitle}>
        <EmptyState icon="✅" title={x.none} body={x.noneBody} />
      </Page>
    );
  const taken = new Set(
    livePlayers()
      .filter((p) => !p.local)
      .map((p) => p.nameKey),
  );
  const finish = () => {
    const matches: Record<string, string | null> = {};
    for (const { p, match } of people) {
      if (match && same[p.id] !== false) matches[p.id] = match.id;
      else {
        const nm =
          rename[p.id] ?? (match ? suggestName(p.displayName, taken, p.lastName) : p.displayName);
        archive.put('players', {
          ...p,
          displayName: nm,
          nameKey: nameKey(nm),
          email: emailKey(emails[p.id] ?? p.email ?? ''),
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
  const emailField = (p: { id: string; displayName: string; email?: string | null }) => (
    <Field
      label={x.emailFor(p.displayName)}
      type="email"
      inputMode="email"
      autoCapitalize="off"
      value={emails[p.id] ?? p.email ?? ''}
      onChange={(v) => setEmails({ ...emails, [p.id]: v })}
      hint={x.emailHint}
    />
  );
  if (step === 'players')
    return (
      <Page title={x.matchTitle}>
        <p className="mb-5 text-15 text-[var(--tx2)]">{x.matchBody}</p>
        <ul className="flex flex-col gap-3">
          {people.map(({ p, match }, i) => {
            const isSame = !!match && same[p.id] !== false;
            const suggestion = suggestName(p.displayName, taken, p.lastName);
            const nm = rename[p.id] ?? suggestion;
            return (
              <motion.li key={p.id} {...stagger(i)} className="glass p-4">
                <div className="mb-2 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-full text-22"
                    style={{ background: p.color }}
                  >
                    {p.emoji}
                  </span>
                  <span className="flex-1 text-17 font-bold">{p.displayName}</span>
                  {!match && <span className="text-13 text-[var(--tx2)]">{x.newOne}</span>}
                </div>
                {match && (
                  <>
                    <p className="mb-2 text-15">
                      {x.same(match.displayName)} {match.emoji}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-pressed={isSame}
                        onClick={() => setSame({ ...same, [p.id]: true })}
                        className={`min-h-11 rounded-xl px-3 text-14 font-bold ${isSame ? 'bg-[var(--accent)] text-ink-on-accent' : 'glass'}`}
                      >
                        {x.yes}
                      </button>
                      <button
                        type="button"
                        aria-pressed={!isSame}
                        onClick={() => setSame({ ...same, [p.id]: false })}
                        className={`min-h-11 rounded-xl px-3 text-14 font-bold ${!isSame ? 'bg-[var(--accent)] text-ink-on-accent' : 'glass'}`}
                      >
                        {x.no}
                      </button>
                    </div>
                    {!isSame && (
                      <div className="mt-3">
                        {emailField(p)}
                        <Field
                          label={x.renameTo}
                          value={nm}
                          maxLength={14}
                          onChange={(v) => setRename({ ...rename, [p.id]: v })}
                          error={taken.has(nameKey(nm)) ? x.taken : ''}
                        />
                      </div>
                    )}
                  </>
                )}
                {!match && emailField(p)}
              </motion.li>
            );
          })}
        </ul>
        <PrimaryButton
          className="mt-5 w-full"
          disabled={people.some(
            ({ p, match }) =>
              (match &&
                same[p.id] === false &&
                taken.has(
                  nameKey(rename[p.id] ?? suggestName(p.displayName, taken, p.lastName)),
                )) ||
              ((!match || same[p.id] === false) && !emailOk(emails[p.id] ?? p.email ?? '')),
          )}
          onClick={finish}
        >
          {x.add(chosen.size)}
        </PrimaryButton>
      </Page>
    );
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
