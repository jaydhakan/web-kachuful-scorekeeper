import { applyToEveryone, restoreAppearance, themeLabel } from '@/state/theme';
import type { Appearance, ThemeId } from '@/theme/themes';
import { say } from './notice';

export interface ApplyText {
  applied: (name: string) => string;
  appliedHere: (name: string) => string;
  undo: string;
}

/**
 * Applies the theme everyone gets and says what happened (saved for everyone, or on this device only) with an 8s
 * Undo, in the platform's notice slot, so the result outlives the menu or page it came from.
 */
export async function applyThemeWithUndo(
  pick: ThemeId,
  allow: boolean,
  who: string,
  text: ApplyText,
  onUndo?: (previous: Appearance | null) => void,
) {
  const r = await applyToEveryone(pick, allow, who);
  say((r.saved === 'everyone' ? text.applied : text.appliedHere)(themeLabel(pick)), {
    action: {
      label: text.undo,
      run: () => {
        void restoreAppearance(r.previous, who);
        onUndo?.(r.previous);
      },
    },
  });
  return r;
}
