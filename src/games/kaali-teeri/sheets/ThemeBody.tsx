import { m } from 'framer-motion';
import { PRESS } from '@/components/ui/motion';
import { loadSession } from '@/state/persistence';
import { chooseOwnTheme, themeLabel, useThemeState } from '@/state/theme';
import { THEME_IDS, type ThemeId } from '@/theme/themes';
import { ktShell } from '@/games/kaali-teeri/strings/shell';

/** A player's own theme, as in Kachuful's theme sheet (it reads Kachuful's store, so it can't be reused here). */
export default function ThemeBody() {
  const th = useThemeState();
  const signedIn = !!loadSession();
  const opts: [ThemeId | null, string][] = [
    [null, ktShell.theme.followAdmin],
    ...THEME_IDS.map((id): [ThemeId, string] => [id, themeLabel(id)]),
  ];
  return (
    <div role="radiogroup" aria-label={ktShell.theme.title} className="flex flex-col gap-1 pb-2">
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
