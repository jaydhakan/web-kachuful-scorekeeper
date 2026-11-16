import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { home as h } from '@/games/spades/strings/home';
import { spGo } from '@/games/spades/nav';

/** A part of Spades not built yet: says so, with the way back to Home. */
export function Soon({ title, body }: { title: string; body: string }) {
  return (
    <main className="app-root scr-bg grid h-full w-full place-content-center justify-items-center gap-4 p-6 text-center">
      <h1 className="disp text-28 font-bold tracking-[-0.02em]">{title}</h1>
      <p className="max-w-[36ch] text-16 text-[var(--tx2)]">{body}</p>
      <PrimaryButton className="min-w-[16rem] px-6" onClick={() => spGo('')}>
        {h.soon.back}
      </PrimaryButton>
    </main>
  );
}
