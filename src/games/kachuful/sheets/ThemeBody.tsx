import { ThemeChoice } from '@/components/ThemeChoice';
import { t } from '@/strings';

export function ThemeBody() {
  return <ThemeChoice followAdmin={t.theme.followAdmin} label={t.theme.own} />;
}
