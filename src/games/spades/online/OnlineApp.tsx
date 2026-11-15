import type { ReactElement } from 'react';
import { home as h } from '@/games/spades/strings/home';
import { Soon } from '@/games/spades/screens/Soon';
import type { OnlineEntry } from './entry';

// Placeholder owned by the online-play agent: the lobby and table replace this body (plan §2.2 to §2.5).
const OnlineApp: (props: { entry: OnlineEntry }) => ReactElement | null = () => (
  <Soon title={h.soon.online} body={h.soon.onlineBody} />
);
export default OnlineApp;
