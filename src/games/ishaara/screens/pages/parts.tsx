import { createContext, useContext, type ReactNode } from 'react';
import type { Identity, Team } from '@/games/ishaara/domain';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { ipg } from '@/games/ishaara/strings/pages';
import { PageFrame, type PageProps } from '@/components/ui/PageParts';
import type { Face } from '@/components/ui/Avatar';
import { FitWord } from '../board/FitWord';
import { Mark as BoardMark, TEAM_TX } from '../board/marks';

/** A player as the pages draw them: a registry id with a face and a name. */
export interface Who extends Face {
  id: string;
  name: string;
}

export type HubRoute =
  | { page: 'history' }
  | { page: 'game'; id: string; summary?: IshaaraSummaryOut }
  | { page: 'leaderboard' }
  | { page: 'player'; who: Who }
  | { page: 'h2h'; a: Who; b: Who }
  | { page: 'rules' };

export interface HubNav {
  open: (r: HubRoute) => void;
  back: () => void;
}

export const HubNavCtx = createContext<HubNav>({ open: () => {}, back: () => {} });
export const useHubNav = () => useContext(HubNavCtx);

/** An Ishaara hub page: the shared frame, Back closing the top page. */
export function IshPage(props: Omit<PageProps, 'onBack'>) {
  const { back } = useHubNav();
  return <PageFrame onBack={back} {...props} />;
}

/** The board's one drawing of the marks, at the pages' default size. */
export function Mark({ id, className = 'h-4 w-4' }: { id: Identity; className?: string }) {
  return <BoardMark id={id} className={className} />;
}

/** A team's colour as text, for its mark on a plain surface (the text-safe shade, 4.5:1 in every theme). */
export const TEAM_TEXT = TEAM_TX;

/** A card face for each identity: its colour and the ink that reads on it. */
export const CARD_FACE: Record<Identity, string> = {
  sun: 'bg-team-sun text-team-sun-ink',
  moon: 'bg-team-moon text-team-moon-ink',
  blank: 'bg-word-blank text-word-blank-ink',
  trap: 'bg-word-trap text-word-trap-ink',
};

/** The outline an unpicked card wears on the plain card face. */
const RING: Record<Identity, string> = {
  sun: 'shadow-[inset_0_0_0_3px_var(--team-sun)]',
  moon: 'shadow-[inset_0_0_0_3px_var(--team-moon)]',
  blank: 'shadow-[inset_0_0_0_3px_var(--word-blank)]',
  trap: 'shadow-[inset_0_0_0_3px_var(--word-trap)]',
};

/** One card of the key: full colour once picked, the plain face with a coloured edge if it never was. */
export function WordCard({
  word,
  id,
  picked,
  small,
}: {
  word: string;
  id: Identity;
  picked: boolean;
  small?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={ipg.game.cardLabel(word, ipg.identity[id], picked)}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 text-center ${small ? 'min-h-12 py-1.5' : 'min-h-[3.75rem] py-2'} ${picked ? CARD_FACE[id] : `bg-word-card text-word-card-ink ${RING[id]}`}`}
    >
      <Mark id={id} className="h-3.5 w-3.5" />
      <span className="max-w-full text-13 font-bold uppercase leading-tight tracking-[0.02em]">
        <FitWord>{word}</FitWord>
      </span>
    </div>
  );
}

/** A full-width row that opens something. */
export function RowButton({
  label,
  onClick,
  children,
}: {
  label?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
    >
      {children}
    </button>
  );
}

/** A team's name with its mark, for lists and headings. */
export function TeamName({ team, children }: { team: Team; children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={TEAM_TEXT[team]}>
        <Mark id={team} className="h-3.5 w-3.5" />
      </span>
      {children ?? ipg.team[team]}
    </span>
  );
}
