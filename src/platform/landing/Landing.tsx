import { platform } from '@/strings/platform';
import { GAMES } from '../catalog';
import { go } from '../route';

/** The site's front page: every game, with Play or Resume. */
export default function Landing() {
  return (
    <main className="app-root scr-bg h-full w-full overflow-y-auto px-4 pb-10 pt-[max(24px,env(safe-area-inset-top))]">
      <h1 className="text-32 font-bold">{platform.name}</h1>
      <p className="mb-6 text-16 text-[var(--tx2)]">{platform.tagline}</p>
      <ul className="grid gap-4">
        {GAMES.map((g) => {
          const r = g.status === 'live' ? g.peek() : null;
          return (
            <li key={g.id} className="glass rounded-2xl p-4">
              <h2 className="text-20 font-bold">{g.name}</h2>
              <p className="text-16 text-[var(--tx2)]">{g.pitch}</p>
              <p className="mono-label text-13 text-[var(--tx2)]">{g.players}</p>
              {r && <p className="mt-2 text-16">{r.line}</p>}
              {g.status === 'live' && (
                <a
                  href={g.path}
                  className="mt-3 inline-flex min-h-11 items-center font-bold underline"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    go(g.id);
                  }}
                >
                  {g.name}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
