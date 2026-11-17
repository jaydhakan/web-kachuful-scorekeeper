import { AnimatePresence, m } from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { SeatInviteCards } from '@/components/seat-invites/InviteCard';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { stagger } from '@/components/ui/stagger';
import { vibrate } from '@/hooks/useHaptics';
import { useHistorySync } from '@/hooks/useHistorySync';
import { authSearch } from '@/lib/entry';
import { fmt } from '@/lib/format';
import { go } from '@/platform/route';
import { signedInAs, useSession } from '@/sync/session';
import { totals } from '@/games/spades/domain/standings';
import type { SpHand } from '@/games/spades/domain/types';
import { spGo, type TablePage } from '@/games/spades/nav';
import JoinCodeSheet from '@/games/spades/sheets/JoinCode';
import { peek, type SpPeek } from '@/games/spades/state/peek';
import { home as h } from '@/games/spades/strings/home';
import { LazyPart } from './LazyPart';
import { Spade, SpadeMark } from './SpadeMark';

const loadRules = () => import('@/games/spades/sheets/RulesBody');
const loadActive = () => import('@/games/spades/online/ActiveTables');

const subscribeOnline = (f: () => void) => {
  addEventListener('online', f);
  addEventListener('offline', f);
  return () => {
    removeEventListener('online', f);
    removeEventListener('offline', f);
  };
};
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine !== false);

// Feedback starts on press, not release: the scale is CSS (.press), the buzz is here (a no-op on iOS).
const buzz = () => vibrate(8);

function CardButton({
  accent,
  className = '',
  children,
  onClick,
}: {
  accent?: boolean;
  className?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={buzz}
      onClick={onClick}
      className={`press relative isolate inline-flex min-h-[52px] items-center justify-center rounded-[16px] px-4 text-16 font-bold ${
        accent ? 'mat-cta mat-cta-on mat-tone-accent text-ink-on-accent' : 'mat-fill-s'
      } ${className}`}
    >
      {accent && <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />}
      {children}
    </button>
  );
}

/** Sign-in lives in Kachuful's account pages; it returns here, carrying a join code so the table still opens. */
function SignInLink({ joinCode }: { joinCode: string | null }) {
  const search = authSearch('signin', 'spades', joinCode ? `?join=${joinCode}` : undefined);
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go('kachuful', search);
  };
  return (
    <a
      href={`/kachuful${search}`}
      onClick={open}
      onPointerDown={buzz}
      className="mat-cta mat-cta-on mat-tone-accent press relative isolate flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] px-4 text-16 font-bold text-ink-on-accent"
    >
      <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />
      <span aria-hidden>{Icon.lock}</span>
      {joinCode ? h.online.signInJoin(joinCode) : h.online.signIn}
    </a>
  );
}

function OnlineCard({
  signedIn,
  online,
  joinCode,
  onJoin,
}: {
  signedIn: boolean;
  online: boolean;
  joinCode: string | null;
  onJoin: () => void;
}) {
  let actions: ReactNode;
  if (!signedIn)
    actions = (
      <>
        <p className="mb-3.5 text-14 leading-[1.4] text-[var(--tx2)]">
          {joinCode ? h.online.signInJoinBody(joinCode) : h.online.signInBody}
        </p>
        <SignInLink joinCode={joinCode} />
      </>
    );
  else if (!online)
    actions = (
      <div role="status" className="flex flex-col gap-1.5">
        <p className="inline-flex min-h-11 items-center gap-2 self-start rounded-[var(--r-sm)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 text-15 font-bold text-[var(--warning)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_35%,transparent)]">
          <span aria-hidden>{Icon.cloud}</span>
          {h.online.offline}
        </p>
        <p className="text-14 text-[var(--tx2)]">{h.online.offlineBody}</p>
      </div>
    );
  else
    actions = (
      <div className="grid grid-cols-1 gap-2.5 @[18rem]:grid-cols-2">
        <CardButton accent onClick={() => spGo('?table=new')}>
          {h.online.start}
        </CardButton>
        <CardButton onClick={onJoin}>{h.online.join}</CardButton>
      </div>
    );
  return (
    <section
      aria-labelledby="sp-online"
      className="glass relative isolate overflow-hidden p-[18px] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--felt-rim)_35%,transparent)] @container"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--felt-hi)_24%,transparent),color-mix(in_srgb,var(--felt-lo)_18%,transparent))]"
      />
      <Spade className="pointer-events-none absolute -bottom-10 -right-5 -z-10 h-[150px] w-[150px] text-[var(--tx)] opacity-[.07]" />
      <span className="absolute right-3.5 top-3.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-2.5 py-0.5 text-13 font-bold text-[var(--accent-tx)]">
        {h.online.tag}
      </span>
      <h2 id="sp-online" className="disp pr-24 text-20 font-bold tracking-[-0.02em]">
        {h.online.title}
      </h2>
      <p className="mb-3.5 mt-1 text-14 leading-[1.4] text-[var(--tx2)]">{h.online.body}</p>
      {actions}
    </section>
  );
}

/** "Riya & Dev 142 · Arjun & Meera −30", scored with the domain; the peek's own line if the hands won't score. */
function scoreLine(p: SpPeek): string {
  try {
    const t = totals(p.hands as SpHand[]);
    return `${h.resume.score(p.teams[0], fmt(t.a.score))} · ${h.resume.score(p.teams[1], fmt(t.b.score))}`;
  } catch {
    return p.line;
  }
}

function ResumeRow({ p }: { p: SpPeek }) {
  return (
    <button
      type="button"
      onClick={() => spGo('?keep')}
      aria-label={h.resume.aria(p.hand)}
      className="glass press flex min-h-16 w-full items-center gap-3 p-3.5 text-left"
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--success)_16%,transparent)]"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-16 font-bold">{h.resume.title(p.hand)}</span>
        <span className="text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">{scoreLine(p)}</span>
      </span>
      <span aria-hidden className="text-[var(--dis)]">
        {Icon.chev}
      </span>
    </button>
  );
}

function KeepCard() {
  return (
    <section aria-labelledby="sp-keep" className="glass p-[18px]">
      <h2 id="sp-keep" className="disp text-20 font-bold tracking-[-0.02em]">
        {h.keep.title}
      </h2>
      <p className="mb-3.5 mt-1 text-14 leading-[1.4] text-[var(--tx2)]">{h.keep.body}</p>
      <CardButton className="w-full" onClick={() => spGo('?keep')}>
        {h.keep.open}
      </CardButton>
    </section>
  );
}

function Links({ onRules, signedIn }: { onRules: () => void; signedIn: boolean }) {
  const page = (p: TablePage) => () => spGo(`?keep&page=${p}`);
  const links: [string, () => void][] = [
    [h.links.history, page('history')],
    [h.links.leaderboard, page('leaderboard')],
    [h.links.awards, page('awards')],
    ...(signedIn ? [[h.links.activity, page('activity')] as [string, () => void]] : []),
    [h.links.rules, onRules],
  ];
  return (
    <nav aria-label={h.links.nav} className="flex flex-wrap gap-2">
      {links.map(([label, onClick]) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="press mat-fill-s min-h-12 flex-[1_1_5.5rem] whitespace-nowrap rounded-[14px] px-3 text-15 font-semibold"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={h.rulesTitle} onClose={onClose} full roomy="panel">
      <LazyPart
        load={loadRules}
        props={{}}
        loading={
          <p role="status" className="py-6 text-16 text-[var(--tx2)]">
            {h.rulesLoading}
          </p>
        }
        failed={(retry) => (
          <div role="alert" className="flex flex-col items-start gap-3 py-6">
            <p className="text-16">{h.rulesFailed}</p>
            <button
              type="button"
              onClick={retry}
              className="press mat-fill-s min-h-11 rounded-xl px-4 text-15 font-bold"
            >
              {h.retry}
            </button>
          </div>
        )}
      />
    </Sheet>
  );
}

type SheetName = 'join' | 'rules';

/**
 * Spades' home: invites, Play online, what's in progress, Keep score, and History · Leaderboard · Awards · Rules. One DOM
 * at every size; from tablet width the hero sits beside the cards. `joinCode` is a `?join=` link opened signed out.
 */
export default function Home({ joinCode = null }: { joinCode?: string | null }) {
  const signedIn = !!signedInAs(useSession());
  const online = useOnline();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  // Read once per visit: nothing changes the saved table game while Home is on screen.
  const [saved] = useState(peek);
  useHistorySync(sheet ? 1 : 0, () => setSheet(null));
  const close = () => setSheet(null);
  // Leaving from a sheet waits for the sheet's history entry to go first, or Back would land on it.
  const next = useRef<string | null>(null);
  useEffect(() => {
    const to = next.current;
    if (sheet || to === null) return;
    next.current = null;
    const leave = () => spGo(to);
    addEventListener('popstate', leave, { once: true });
    return () => removeEventListener('popstate', leave);
  }, [sheet]);
  return (
    <div className="app-root scr-bg relative h-full w-full">
      <div {...(sheet ? { inert: '' as const } : {})} className="absolute inset-0 flex flex-col">
        <header className="flex shrink-0 items-center pl-[max(0.5rem,var(--sal))] pr-[max(0.5rem,var(--sar))] pt-[max(0.5rem,var(--sat))]">
          <IconButton label={h.allGames} onClick={() => go(null)} chrome>
            {Icon.back}
          </IconButton>
        </header>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[max(1.5rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))]">
          <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-3 big:grid big:min-h-full big:max-w-[64rem] big:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] big:content-center big:items-center big:gap-x-14 big:py-6">
            <m.div
              {...stagger(0)}
              className="flex flex-col items-center pb-5 pt-2 text-center land:pb-2 land:pt-0 big:items-start big:pb-0 big:text-left"
            >
              <SpadeMark className="mb-3 h-24 w-24 land:mb-1.5 land:h-14 land:w-14 big:mb-5 big:h-32 big:w-32" />
              <h1 className="disp text-48 font-bold leading-none tracking-[-0.04em] land:text-34 big:text-72">
                {h.name}
              </h1>
              <p className="mt-2 text-16 text-[var(--tx2)] big:mt-3 big:text-20">{h.tagline}</p>
            </m.div>
            <div className="flex w-full flex-col gap-3">
              <m.div {...stagger(1, 0.04)} className="w-full empty:hidden">
                <SeatInviteCards game="spades" />
              </m.div>
              <m.div {...stagger(2, 0.04)}>
                <OnlineCard
                  signedIn={signedIn}
                  online={online}
                  joinCode={joinCode}
                  onJoin={() => setSheet('join')}
                />
              </m.div>
              {saved && (
                <m.div {...stagger(3, 0.04)}>
                  <ResumeRow p={saved} />
                </m.div>
              )}
              {signedIn && (
                <LazyPart load={loadActive} props={{}} loading={null} failed={() => null} />
              )}
              <m.div {...stagger(4, 0.04)}>
                <KeepCard />
              </m.div>
              <m.div {...stagger(5, 0.04)}>
                <Links onRules={() => setSheet('rules')} signedIn={signedIn} />
              </m.div>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {sheet === 'join' && (
          <JoinCodeSheet
            key="join"
            onClose={close}
            onJoin={(code) => {
              next.current = `?join=${code}`;
              setSheet(null);
            }}
          />
        )}
        {sheet === 'rules' && <RulesSheet key="rules" onClose={close} />}
      </AnimatePresence>
    </div>
  );
}
