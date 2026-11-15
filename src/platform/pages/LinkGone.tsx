import { useApp } from '@/games/kachuful/state/store';
import { EmptyState } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ApiError } from '@/sync/api';
import { platform } from '@/strings/platform';
import { go } from '../route';

const s = platform.linkGone;

/** True when a link couldn't be checked because the device is offline, not because the link is bad. */
export const offlineError = (e: unknown) => e instanceof ApiError && !!e.offline;

/**
 * An invite or reset link that can't be used, with a next step: offline, try again; used or expired, sign in (the
 * usual case: the link was already used) or go to all games.
 */
export function LinkGone({
  msg,
  offline,
  onRetry,
}: {
  msg: string;
  offline: boolean;
  onRetry: () => void;
}) {
  const { actions } = useApp();
  return (
    <EmptyState
      icon={offline ? 'offline' : 'hourglass'}
      title={msg}
      body={offline ? undefined : s.body}
      action={
        <div className="flex flex-col items-center gap-2">
          {offline ? (
            <PrimaryButton onClick={onRetry}>{s.retry}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => actions.navReset([{ screen: 'signin' }])}>
              {s.signIn}
            </PrimaryButton>
          )}
          <button
            type="button"
            onClick={() => go(null)}
            className="press min-h-11 px-3 text-16 font-semibold underline"
          >
            {platform.allGames}
          </button>
        </div>
      }
    />
  );
}
