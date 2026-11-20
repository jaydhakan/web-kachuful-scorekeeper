import { AppShell } from './components/AppShell';
import { MedalsProvider } from './state/medals';
import { AppProvider } from './state/store';

export { prepare } from './chunks';

/** Kachuful's lazy root: its store, sync and archive mount only on /kachuful (the platform catalog loads it). */
export default function Kachuful() {
  return (
    <AppProvider>
      <MedalsProvider>
        <AppShell />
      </MedalsProvider>
    </AppProvider>
  );
}
