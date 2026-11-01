import { m } from 'framer-motion';
import { useApp } from '@/state/store';
import { chooseOwnTheme, themeLabel, useThemeState } from '@/state/theme';
import { PRESS } from '@/components/ui/motion';
import { THEME_IDS, type ThemeId } from '@/theme/themes';
import { t } from '@/strings';

/** A player's own theme, offered only while the admin lets players choose (ADMIN_THEME_SWITCHER.md §1). */
export function ThemeBody() {
  const { state } = useApp();
  const th = useThemeState();
  const signedIn = !!state.session;
  const opts: [ThemeId | null, string][] = [
    [null, t.theme.followAdmin],
    ...THEME_IDS.map((id): [ThemeId, string] => [id, themeLabel(id)]),
  ];
  return (
    <div role="radiogroup" aria-label={t.theme.own} className="flex flex-col gap-1 pb-2">
      {opts.map(([id, label]) => {
        const on = th.user === id;
        return (
          <m.button
            key={label}
            type="button"
            role="radio"
            aria-checked={on}
            whileTap={PRESS}
            onClick={() => chooseOwnTheme(id, signedIn)}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-2 text-left text-18 font-medium"
          >
            {label}
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_2px_var(--tx2)] ${on ? '!shadow-[inset_0_0_0_7px_var(--brand)]' : ''}`}
            />
          </m.button>
        );
      })}
    </div>
  );
}
