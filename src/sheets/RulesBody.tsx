import { rulesItems } from '@/strings/rules';
import type { Game } from '@/domain';

export function RulesBody({ game }: { game: Game }) {
  const items = rulesItems(game.direction);
  return (
    <div className="text-16 leading-[1.55] text-tx-rules">
      {items.map(([ic, t, b]) => (
        <div key={t} className="mb-5">
          <h3 className="disp mb-1.5 text-20 font-extrabold tracking-[-0.025em]">
            {ic} {t}
          </h3>
          {b}
        </div>
      ))}
    </div>
  );
}
