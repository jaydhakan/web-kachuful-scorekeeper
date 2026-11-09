import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';

/** Kaali Teeri's lazy root: its store and shell mount only on /kaali-teeri (the platform registry loads it). */
export default function KaaliTeeri() {
  return (
    <KtProvider>
      <KtShell />
    </KtProvider>
  );
}
