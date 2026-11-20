import { NightReadyCard, useReadyNight } from '@/games/kachuful/components/NightReady';
import { nightSearch } from '@/lib/entry';
import { signedInAs, useSession } from '@/sync/session';
import { go } from '../route';

/** The landing page's "Your night is ready": opens the night in Kachuful, where the story lives. */
export default function NightReadyLanding() {
  const ready = useReadyNight(signedInAs(useSession())?.player?.id ?? null);
  if (!ready) return null;
  return (
    <NightReadyCard
      ready={ready}
      onOpen={() => go('kachuful', nightSearch(ready.id))}
      className="big:max-w-[28rem]"
    />
  );
}
