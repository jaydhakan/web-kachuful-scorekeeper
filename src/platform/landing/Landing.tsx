import { AnimatePresence } from 'framer-motion';
import { useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { BaithakMark } from '@/components/ui/BaithakMark';
import { Icon } from '@/components/ui/Icons';
import { agoTxt } from '@/lib/format';
import { useSession } from '@/sync/session';
import { platform } from '@/strings/platform';
import { GAMES, type GameEntry, type Resume } from '../catalog';
import { go } from '../route';
import { LandingMenu, openInKachuful } from './LandingMenu';
import { openGame } from './OpenGame';
import { PersonDot } from './PersonDot';
import { GameIcon, TileArt } from './TileArt';
import { Wordmark } from './Wordmark';

const s = platform.landing;

const subscribeOnline = (f: () => void) => {
  addEventListener('online', f);
  addEventListener('offline', f);
  return () => {
    removeEventListener('online', f);
    removeEventListener('offline', f);
  };
};
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);

/**
 * A plain left-click opens the game in place (no reload); new-tab and other modified clicks go to the browser.
 * From a tile (`grow`), the tile's art grows into the game; Enter on the tile arrives here as a click too.
 */
function follow(e: MouseEvent<HTMLAnchorElement>, g: GameEntry, grow = false) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  e.preventDefault();
  if (!grow) return go(g.id);
  openGame(
    g.id,
    e.currentTarget.querySelector('[data-tile-art]'),
    <TileArt game={g.id} className="block h-full w-full" />,
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const session = useSession();
  return (
    <header className="flex min-h-14 items-center justify-between gap-2">
      <span className="flex items-center gap-2.5" role="img" aria-label={platform.name}>
        <BaithakMark className="h-9 w-9 big:h-11 big:w-11" />
        <Wordmark className="h-7 w-auto big:h-9" />
      </span>
      <div className="flex items-center gap-2">
        <a
          href={`/kachuful?open=${session ? 'account' : 'signin'}`}
          onClick={(e) => openInKachuful(e, session ? 'account' : 'signin')}
          aria-label={
            session ? s.account(session.player?.displayName ?? session.user.email) : undefined
          }
          className={`mat-ibtn press inline-flex min-h-12 max-w-[11rem] items-center gap-2 !rounded-full text-16 font-bold ${session ? 'pl-1.5 pr-4' : 'px-5'}`}
        >
          {session ? (
            <>
              <PersonDot session={session} className="h-9 w-9 text-20" />
              <span aria-hidden className="leading-tight [overflow-wrap:anywhere]">
                {session.player?.displayName ?? session.user.email}
              </span>
            </>
          ) : (
            s.signIn
          )}
        </a>
        <button
          type="button"
          aria-label={s.menu}
          onClick={onMenu}
          className="mat-ibtn press grid h-12 w-12 place-items-center rounded-2xl"
        >
          {Icon.menu}
        </button>
      </div>
    </header>
  );
}

function ResumePanel({ rows }: { rows: [GameEntry, Resume][] }) {
  return (
    <section aria-labelledby="landing-resume" className="flex flex-col gap-2">
      <h2 id="landing-resume" className="mono-label text-13 text-[var(--accent-tx)]">
        {s.inProgress}
      </h2>
      <ul className="glass flex flex-col divide-y divide-[var(--hairline)] px-3.5">
        {rows.map(([g, r]) => (
          <li key={g.id} className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 py-3">
            <GameIcon game={g.id} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-17 font-bold">{g.name}</span>
              <span className="flex items-start gap-1.5 text-15 text-[var(--tx2)]">
                <span
                  aria-hidden
                  className="mt-[0.4em] h-2 w-2 shrink-0 rounded-full bg-[var(--success)]"
                />
                <span>
                  {r.line} · {s.saved(agoTxt(r.updatedAt))}
                </span>
              </span>
            </div>
            <a
              href={g.path}
              aria-label={s.resumeAria(g.name)}
              onClick={(e) => follow(e, g)}
              className="mat-cta mat-cta-on mat-tone-accent text-ink-on-accent press relative isolate inline-flex min-h-12 items-center rounded-[18px] px-4 text-16 font-bold"
            >
              <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />
              {s.resume}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GameCard({ g, signedIn }: { g: GameEntry; signedIn: boolean }) {
  const soon = g.status === 'soon';
  const locked = !soon && g.signedInOnly && !signedIn;
  const body = (
    <>
      <div
        data-tile-art
        className="h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-[var(--r-md)] big:aspect-[16/10] big:h-auto big:w-full big:rounded-none"
      >
        <TileArt
          game={g.id}
          className={`block h-full w-full ${soon ? 'opacity-60 grayscale' : ''}`}
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1 big:px-5 big:pt-4">
        <h3 className="disp text-22 font-bold tracking-[-0.02em] big:text-28">{g.name}</h3>
        <p
          className={`text-15 leading-[1.35] big:text-17 ${soon ? 'text-[var(--dis)]' : 'text-[var(--tx2)]'}`}
        >
          {g.pitch}
        </p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-2 big:mt-auto big:px-5 big:pb-5">
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-14 font-semibold text-[var(--tx2)] shadow-[inset_0_0_0_1px_var(--hairline-2)]">
          <span aria-hidden>{Icon.players}</span>
          {g.players}
        </span>
        {soon ? (
          <span className="mono-label rounded-full bg-[var(--soon-bg)] px-3 py-1.5 text-13 font-bold text-[var(--soon-ink)] shadow-[inset_0_0_0_1px_var(--soon-edge)]">
            {s.soon}
          </span>
        ) : (
          <span className="mat-ibtn inline-flex min-h-11 items-center gap-2 !rounded-full px-4 text-17 font-bold">
            {locked && <span aria-hidden>{Icon.lock}</span>}
            {locked ? s.signInToPlay : s.play}
            {!locked && <span aria-hidden>{Icon.arrow}</span>}
          </span>
        )}
      </div>
    </>
  );
  const box =
    'glass grid h-full grid-cols-[5.5rem_1fr] gap-x-3.5 gap-y-3 overflow-hidden p-3 big:flex big:flex-col big:gap-3 big:p-0';
  if (soon)
    // Not a control: the name, pitch and badge read as text, and the card can't be activated.
    return (
      <article aria-label={s.soonAria(g.name)} className={`${box} opacity-90`}>
        {body}
      </article>
    );
  // Named by its own text (name, pitch, players, then Play), so what's read is what's shown.
  return (
    <a
      href={locked ? '/kachuful?open=signin' : g.path}
      onClick={(e) => (locked ? openInKachuful(e, 'signin') : follow(e, g, true))}
      className={`${box} press`}
    >
      {body}
    </a>
  );
}

/** The site's front page: every game, with what's in progress first (docs/PLATFORM-PLAN.md §5.6). */
export default function Landing() {
  const session = useSession();
  const online = useOnline();
  const [menu, setMenu] = useState(false);
  // Read once per visit: the landing page shows while no game is running, so nothing changes these meanwhile.
  const resumes = useMemo(
    () =>
      GAMES.flatMap((g): [GameEntry, Resume][] => {
        const r = g.status === 'live' ? g.peek() : null;
        return r ? [[g, r]] : [];
      }).sort((a, b) => b[1].updatedAt - a[1].updatedAt),
    [],
  );
  return (
    <div className="app-root scr-bg relative h-full w-full">
      <div className="scroll-thin h-full overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-5 pb-10 pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] pt-[calc(var(--sat)+0.875rem)] big:gap-8 big:pl-[max(2.75rem,var(--sal))] big:pr-[max(2.75rem,var(--sar))] big:pt-[calc(var(--sat)+2rem)]">
          <Header onMenu={() => setMenu(true)} />
          {!online && (
            <p
              role="status"
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-[var(--r-sm)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 text-15 font-bold text-[var(--warning)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_35%,transparent)]"
            >
              <span aria-hidden>{Icon.cloud}</span>
              {s.offline}
            </p>
          )}
          <main className="flex flex-col gap-5 big:gap-10">
            <div className="flex flex-col gap-5 big:grid big:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] big:items-center big:gap-12">
              <div className="flex flex-col gap-3">
                <h1 className="disp text-36 font-bold leading-none tracking-[-0.03em] big:text-64">
                  {s.title}
                </h1>
                <p className="hidden max-w-[44ch] text-18 leading-[1.45] text-[var(--tx2)] big:block">
                  {s.intro}
                </p>
              </div>
              {resumes.length > 0 && <ResumePanel rows={resumes} />}
            </div>
            <section aria-labelledby="landing-games" className="flex flex-col gap-2 big:gap-4">
              <h2 id="landing-games" className="mono-label text-13 text-[var(--accent-tx)]">
                {s.games}
              </h2>
              <ul className="grid gap-3 big:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] big:gap-6">
                {GAMES.map((g) => (
                  <li key={g.id}>
                    <GameCard g={g} signedIn={!!session && !session.stale} />
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </div>
      </div>
      <AnimatePresence>{menu && <LandingMenu onClose={() => setMenu(false)} />}</AnimatePresence>
    </div>
  );
}
