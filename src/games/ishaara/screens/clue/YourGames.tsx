import { Icon } from '@/components/ui/Icons';
import { useIshaara } from '@/games/ishaara/state/store';
import { useYourGames } from '@/games/ishaara/state/lists';
import { clue } from '@/games/ishaara/strings/clue';
import { agoTxt } from '@/lib/format';
import { Mark, TINT } from './KeyParts';
import { CTA, OUTLINE, PANEL } from './clueKit';

/** Active games where this account gives the clues ("Your games"). */
export function YourGames() {
  const { actions } = useIshaara();
  const r = useYourGames();
  const items = r.data;

  let body;
  if (!items && r.error)
    body = (
      <div className={`${PANEL} grid gap-3`}>
        <p role="alert" className="text-16">
          {clue.list.error}
        </p>
        <button type="button" onClick={r.reload} className={OUTLINE}>
          {clue.list.retry}
        </button>
      </div>
    );
  else if (!items)
    body = (
      <p role="status" className="text-16 text-key-text-2">
        {clue.list.loading}
      </p>
    );
  else if (!items.length)
    body = (
      <div className={`${PANEL} grid gap-2`}>
        <h2 className="text-20 font-bold">{clue.list.emptyTitle}</h2>
        <p className="text-16 text-key-text-2">{clue.list.empty}</p>
      </div>
    );
  else
    body = (
      <>
        <ul className="grid gap-3">
          {items.map((g) => {
            const team = g.myTeam ?? 'sun';
            return (
              <li key={g.id} className={`${PANEL} grid gap-4`}>
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-[14px] ${TINT[team]}`}
                  >
                    <Mark id={team} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-20 font-bold leading-tight">
                      {clue.list.role(team, g.host.name)}
                    </h2>
                    <p className="mt-1 text-15 text-key-text-2">
                      {clue.list.meta(agoTxt(g.createdAt), g.players.length)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => actions.openGame(g.id, 'clue', 'key')}
                  className={CTA}
                >
                  {clue.list.open}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-16 text-key-text-2">{clue.list.footnote}</p>
      </>
    );

  return (
    <div className="mx-auto grid w-full max-w-[30rem] content-start gap-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => actions.go('home')}
          aria-label={clue.list.back}
          className="press -ml-2 grid h-12 w-12 place-items-center rounded-full"
        >
          {Icon.back}
        </button>
        <h1 className="text-30 font-bold tracking-[-0.02em]">{clue.list.title}</h1>
      </div>
      {r.offline && items && (
        <p role="status" className="text-15 text-key-text-2">
          {clue.list.offline}
        </p>
      )}
      {body}
    </div>
  );
}
