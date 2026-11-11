import type { ReactNode } from 'react';
import type { Identity } from '@/games/ishaara/domain';
import { rulesText as T } from '@/games/ishaara/strings/rules';
import { IshPage, Mark, WordCard } from './parts';

const IDS: readonly Identity[] = ['sun', 'moon', 'blank', 'trap'];

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6" aria-label={title}>
      <h2 className="disp mb-1.5 text-20 font-extrabold tracking-[-0.025em]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const Example = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl bg-ov/[.06] p-3">{children}</p>
);

/** How to play, with the card legend drawn as the board draws it. */
export function RulesPage() {
  return (
    <IshPage title={T.title}>
      <div className="text-16 leading-[1.55] text-tx-rules">
        <p className="mb-6">{T.intro}</p>

        <Part title={T.legend.title}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {IDS.map((id) => (
              <li key={id} className="flex flex-col gap-1.5">
                <WordCard word={T.legend.sample[id]} id={id} picked />
                <span className="flex items-center gap-1.5 text-14 text-[var(--tx2)]">
                  <Mark id={id} className="h-3.5 w-3.5" />
                  {T.legend[id]}
                </span>
              </li>
            ))}
          </ul>
        </Part>

        <Part title={T.setup.title}>
          <p>{T.setup.teams}</p>
          <p>{T.setup.grid}</p>
          <p>{T.setup.key}</p>
        </Part>

        <Part title={T.clue.title}>
          <p>{T.clue.body}</p>
          <Example>{T.clue.example}</Example>
          <p>{T.clue.zero}</p>
          <p>{T.clue.rules}</p>
        </Part>

        <Part title={T.guess.title}>
          <p>{T.guess.body}</p>
          <p>{T.guess.limit}</p>
          <Example>{T.guess.example}</Example>
        </Part>

        <Part title={T.pick.title}>
          <ul className="space-y-2">
            {(
              [
                ['sun', T.pick.own],
                ['moon', T.pick.other],
                ['blank', T.pick.blank],
                ['trap', T.pick.trap],
              ] as const
            ).map(([id, text]) => (
              <li key={id} className="flex items-start gap-2.5">
                <span className="mt-1">
                  <Mark id={id} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Part>

        <Part title={T.challenge.title}>
          <p>{T.challenge.body}</p>
          <p>{T.challenge.penalty}</p>
          <p>{T.challenge.stands}</p>
        </Part>

        <Part title={T.timer.title}>
          <p>{T.timer.body}</p>
        </Part>

        <Part title={T.win.title}>
          <p>{T.win.body}</p>
          <p>{T.win.trap}</p>
          <p>{T.win.match}</p>
        </Part>
      </div>
    </IshPage>
  );
}
