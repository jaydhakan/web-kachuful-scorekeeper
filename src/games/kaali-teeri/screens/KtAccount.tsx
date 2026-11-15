import type { MouseEvent, ReactNode } from 'react';
import { authSearch } from '@/lib/entry';
import { go } from '@/platform/route';
import { useSession } from '@/sync/session';
import { t } from '@/strings';
import { SyncDot } from '@/components/SyncDot';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { IconOn } from '@/components/ui/IconsFill';
import { RailItem } from '@/components/desk/RailItem';

// Sign-in and the account are Kachuful's screens; this is the one place Kaali Teeri opens them, and they come back here.
const where = (signedIn: boolean) => (signedIn ? 'account' : 'signin');
const href = (signedIn: boolean) => `/kachuful${authSearch(where(signedIn), 'kaali-teeri')}`;

function openAccount(signedIn: boolean, e?: MouseEvent) {
  if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)) return;
  e?.preventDefault();
  go('kachuful', authSearch(where(signedIn), 'kaali-teeri'));
}

/** Home's top corner on the phone: the account with its sync state, or Sign in (KT-F04). */
export function KtAccountChip({ className = '' }: { className?: string }) {
  const s = useSession();
  const name = s ? (s.player?.displayName ?? s.user.email) : null;
  return (
    <a
      href={href(!!s)}
      onClick={(e) => openAccount(!!s, e)}
      aria-label={s ? `${t.hub.nav.account}: ${name}` : undefined}
      className={`glass press relative inline-flex min-h-11 max-w-[12rem] items-center gap-2 !rounded-full text-15 font-bold ${s ? 'pl-1.5 pr-3.5' : 'px-4'} ${className}`}
    >
      {s ? (
        <>
          {s.player ? (
            <Avatar
              p={s.player}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
            />
          ) : (
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full">
              {Icon.user}
            </span>
          )}
          <span aria-hidden className="min-w-0 break-words leading-tight">
            {name}
          </span>
          <SyncDot className="absolute -right-1 -top-1" />
        </>
      ) : (
        t.hub.nav.signIn
      )}
    </a>
  );
}

/** The rail's account item: the account icon carries the sync dot, as in Kachuful's rail. */
export function KtAccountRail() {
  const s = useSession();
  const mark = (icon: ReactNode) => (
    <span className="relative">
      {icon}
      <SyncDot className="absolute -right-3 -top-2" />
    </span>
  );
  return (
    <RailItem
      icon={mark(Icon.account)}
      iconOn={mark(IconOn.account)}
      label={s ? t.hub.nav.account : t.hub.nav.signIn}
      onClick={() => openAccount(!!s)}
    />
  );
}

/** The tablet top bar's account button. */
export function KtAccountButton({ className = '' }: { className?: string }) {
  const s = useSession();
  return (
    <a
      href={href(!!s)}
      onClick={(e) => openAccount(!!s, e)}
      aria-label={s ? t.hub.nav.account : t.hub.nav.signIn}
      className={`press relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${className}`}
    >
      {s?.player ? (
        <Avatar p={s.player} className="grid h-8 w-8 place-items-center rounded-full text-18" />
      ) : (
        Icon.account
      )}
      <SyncDot className="absolute -right-1 -top-1" />
    </a>
  );
}
