import { t } from '@/strings';

/**
 * A slim bar across the top while the next page loads behind the one still on screen. It stays invisible for the
 * first 400ms (index.css, `.nav-progress`), so a quick move shows nothing at all.
 */
export function NavProgress() {
  return (
    <div
      role="status"
      data-nav-progress
      className="pointer-events-none fixed inset-x-0 top-[var(--sat)] z-[90] h-[3px]"
    >
      <span className="sr-only">{t.common.loading}</span>
      <span
        aria-hidden
        className="nav-progress block h-full w-full rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
      />
    </div>
  );
}
