import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Icon } from '@/components/ui/Icons';
import { useSession } from '@/sync/session';
import { applyToEveryone, chooseOwnTheme, themeLabel, useThemeState } from '@/state/theme';
import { loadAllThemeCss } from '@/theme/themeCss';
import { THEME_IDS, type ThemeId } from '@/theme/themes';
import { platform } from '@/strings/platform';
import { go } from '../route';
import { PersonDot } from './PersonDot';

const s = platform.menu;

/** Opens a page that still lives in Kachuful (account, sign in, credits) without a reload; modifier-clicks open normally. */
export function openInKachuful(e: MouseEvent<HTMLAnchorElement>, open: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  e.preventDefault();
  go('kachuful', `?open=${open}`);
}

function Row({
  href,
  open,
  icon,
  children,
}: {
  href: string;
  open: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(e) => openInKachuful(e, open)}
      className="press flex min-h-12 w-full items-center gap-3.5 rounded-2xl px-2 text-17 font-medium"
    >
      <span aria-hidden className="grid w-7 place-items-center text-[var(--tx2)]">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      <span aria-hidden className="text-[var(--tx2)]">
        {Icon.chev}
      </span>
    </a>
  );
}

/** The theme row: admins set everyone's, players pick their own while the admin allows it, everyone else sees none. */
function Themes({ admin, who, signedIn }: { admin: boolean; who: string; signedIn: boolean }) {
  const th = useThemeState();
  const allow = !!th.appearance?.allowUserOverride;
  // Each swatch is drawn in its own theme, so every theme's stylesheet is needed.
  useEffect(() => void loadAllThemeCss(), []);
  if (!admin && !allow) return null;
  const current = admin ? (th.appearance?.theme ?? th.shown) : th.user;
  const pick = (id: ThemeId) =>
    admin ? void applyToEveryone(id, allow, who) : chooseOwnTheme(id, signedIn);
  return (
    <section aria-labelledby="landing-theme" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2">
        <h3 id="landing-theme" className="mono-label text-13 text-[var(--accent)]">
          {admin ? s.theme : s.ownTheme}
        </h3>
        {admin && (
          <span className="mono-label rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-13 text-[var(--tx2)]">
            {s.adminsOnly}
          </span>
        )}
      </div>
      <div role="radiogroup" aria-labelledby="landing-theme" className="grid grid-cols-4 gap-2">
        {THEME_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={current === id}
            onClick={() => pick(id)}
            className="press flex min-h-11 flex-col items-stretch gap-1 rounded-[var(--r-md)] p-1 text-center text-14 font-bold"
          >
            <span
              data-theme={id}
              aria-hidden
              className={`scr-bg relative block h-14 rounded-[var(--r-sm)] shadow-[inset_0_0_0_1px_var(--hairline-2)] ${current === id ? 'outline outline-2 outline-offset-2 outline-[var(--focus)]' : ''}`}
            >
              <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-[var(--brand)]" />
            </span>
            {themeLabel(id)}
          </button>
        ))}
      </div>
      {!admin && (
        <button
          type="button"
          aria-pressed={th.user === null}
          onClick={() => chooseOwnTheme(null, signedIn)}
          className="press min-h-11 rounded-2xl px-2 text-left text-16 font-medium underline"
        >
          {s.followAdmin}
        </button>
      )}
      {admin && <p className="px-2 text-14 text-[var(--tx2)]">{s.themeHint}</p>}
    </section>
  );
}

/** The landing page's menu: the account, the theme (admins), credits. */
export function LandingMenu({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const who = session?.player?.displayName ?? session?.user.email ?? '';
  return (
    <Sheet title={s.title} onClose={onClose} roomy="panel">
      <div className="flex flex-col gap-5">
        {session ? (
          <a
            href="/kachuful?open=account"
            onClick={(e) => openInKachuful(e, 'account')}
            className="glass press flex min-h-16 items-center gap-3 p-3"
          >
            <PersonDot session={session} className="h-12 w-12 text-26" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-18 font-bold [overflow-wrap:anywhere]">{who}</span>
              <span className="text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">
                {session.user.email}
              </span>
              <span className="text-14 text-[var(--tx2)]">{s.accountHint}</span>
            </span>
            <span aria-hidden className="text-[var(--tx2)]">
              {Icon.chev}
            </span>
          </a>
        ) : (
          <Row href="/kachuful?open=signin" open="signin" icon={Icon.key}>
            <span className="block">{s.signIn}</span>
            <span className="block text-14 text-[var(--tx2)]">{s.signInHint}</span>
          </Row>
        )}
        <Themes
          admin={session?.user.role === 'admin' && !session.stale}
          who={who}
          signedIn={!!session && !session.stale}
        />
        <Row href="/kachuful?open=credits" open="credits" icon={Icon.heart}>
          {s.credits}
        </Row>
      </div>
    </Sheet>
  );
}
