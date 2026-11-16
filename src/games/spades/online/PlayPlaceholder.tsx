import { Soon } from '../screens/Soon';
import { online as o } from '../strings/online';

// Stands in for the play screen until the merge swaps it for `table/PlayTable`.
export default function PlayPlaceholder() {
  return <Soon title={o.play.title} body={o.play.body} />;
}
