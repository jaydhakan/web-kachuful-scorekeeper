import { useState } from 'react';
import { sameCard, type CardRef } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { curHand } from '@/games/kaali-teeri/state/select';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CardGrid, EMPTY_DRAFT, draftCard, type Draft } from '../screens/hand/call/CardGrid';

const s = ktBidding;

/**
 * Pick or change one called card while the bidder is calling: a new card (sheet `i` null) or called card `i`. A copy
 * change keeps the card's place; a different card replaces it.
 */
export default function CardPicker() {
  const { state, actions } = useKt();
  const g = state.game;
  const sheet = state.sheet;
  const i = sheet?.type === 'card' ? sheet.i : null;
  const h = g && curHand(g);
  const cur: CardRef | undefined = i === null ? undefined : h?.called[i];
  const [draft, setDraft] = useState<Draft>(
    cur ? { rank: cur.rank, suit: cur.suit, copy: cur.copy ?? null } : EMPTY_DRAFT,
  );
  const [why, setWhy] = useState<string | null>(null);
  if (!g || !h || h.phase !== 'calling' || sheet?.type !== 'card' || (i !== null && !cur))
    return <p className="px-1 py-4 text-15 text-[var(--tx2)]">{s.picker.unavailable}</p>;
  const n = g.players.length;
  const others = i === null ? h.called : h.called.filter((_, k) => k !== i);
  const ready = draftCard(draft, others, n);
  // Picking only fills the draft; the button calls it, so a mis-tap is changed before it counts.
  const commit = (card: CardRef) => {
    if (i === null) actions.addCard(card);
    else if (cur && sameCard(card, cur)) {
      if (card.copy !== undefined && card.copy !== cur.copy) actions.setCopy(i, card.copy);
    } else {
      actions.removeCard(i);
      actions.addCard(card);
    }
    actions.openSheet(null);
  };
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="grid place-items-center">
        {draft.rank && draft.suit ? (
          <PlayingCard rank={draft.rank} suit={draft.suit} size="md" />
        ) : (
          <span
            className="grid aspect-[5/7] w-[4.5rem] place-items-center border-2 border-dashed text-28 font-bold text-[var(--tx2)]"
            style={{ borderColor: 'var(--accent)', borderRadius: 8 }}
          >
            ?
          </span>
        )}
      </div>
      <CardGrid
        uid="kt-picker"
        n={n}
        called={others}
        draft={draft}
        onDraft={setDraft}
        onWhy={setWhy}
      />
      <p role="status" aria-live="polite" className="min-h-5 px-1 text-14 text-[var(--warn)]">
        {why}
      </p>
      <PrimaryButton disabled={!ready} onClick={() => ready && commit(ready)}>
        {ready ? s.picker.use(ready.rank, ready.suit) : s.picker.pick}
      </PrimaryButton>
    </div>
  );
}
