import { AppShell } from './components/AppShell';
import { AppProvider } from './state/store';

/** Kachuful's lazy root: its store, sync and archive mount only on /kachuful (the platform catalog loads it). */
export default function Kachuful() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
