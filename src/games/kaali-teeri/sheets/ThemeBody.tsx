import { ThemeChoice } from '@/components/ThemeChoice';
import { ktShell } from '@/games/kaali-teeri/strings/shell';

export default function ThemeBody() {
  return <ThemeChoice followAdmin={ktShell.theme.followAdmin} label={ktShell.theme.title} />;
}
