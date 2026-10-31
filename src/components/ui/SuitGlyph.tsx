import type { Trump } from '@/domain';
import { TR } from '@/theme/trumps';

export const SuitGlyph = ({ trump }: { trump: Trump }) => (
  <span style={{ color: TR[trump].col }}>{TR[trump].sym}</span>
);
