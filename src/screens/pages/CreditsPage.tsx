import type { CSSProperties, ReactNode } from 'react';
import { version } from '../../../package.json';
import { Page } from '@/components/ui/Page';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { canShareLink, shareLink } from '@/lib/clip';
import { t } from '@/strings';
import { credits, initials, instagramUrl, type Person } from './credits.config';
// Imported here, not from index.css, so its styles load with this lazy page instead of on every first load.
import '@/styles/credits.css';

type Suit = 'spade' | 'heart' | 'diamond' | 'club';
const SUITS: Record<Suit, ReactNode> = {
  spade: (
    <path d="M12 2C9.5 6 3 9.2 3 14.2A4.4 4.4 0 0 0 11 16.8C10.9 19 10.2 20.6 8.6 22H15.4C13.8 20.6 13.1 19 13 16.8A4.4 4.4 0 0 0 21 14.2C21 9.2 14.5 6 12 2Z" />
  ),
  heart: (
    <path d="M12 21.5C5.6 16.4 2.8 13 2.8 9.2a4.9 4.9 0 0 1 9.2-2.4 4.9 4.9 0 0 1 9.2 2.4c0 3.8-2.8 7.2-9.2 12.3z" />
  ),
  diamond: <path d="M12 2l7 10-7 10-7-10z" />,
  club: (
    <>
      <circle cx="12" cy="7.3" r="4.4" />
      <circle cx="7" cy="14.2" r="4.4" />
      <circle cx="17" cy="14.2" r="4.4" />
      <path d="M12 12.5l-3.6 9.4h7.2z" />
    </>
  ),
};
const Suit = ({ s, className, style }: { s: Suit; className?: string; style?: CSSProperties }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} style={style}>
    {SUITS[s]}
  </svg>
);
const Sparkle = ({ style }: { style: CSSProperties }) => (
  <svg viewBox="0 0 24 24" aria-hidden className="cr-sp" style={style}>
    <path d="M12 0C12.8 7.5 16.5 11.2 24 12 16.5 12.8 12.8 16.5 12 24 11.2 16.5 7.5 12.8 0 12 7.5 11.2 11.2 7.5 12 0Z" />
  </svg>
);

const fs = (s: Suit, style: CSSProperties) => <Suit s={s} className="cr-fs" style={style} />;
const LINK =
  'press glass inline-flex items-center gap-1.5 text-14 font-semibold text-[var(--text-1)] no-underline';

function Box({
  d,
  icon: ic,
  title,
  children,
}: {
  d: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="cr-box glass p-1.5"
      style={{ '--d': d } as CSSProperties}
    >
      <h2 className="mono-label flex items-center gap-2 px-3 pb-1.5 pt-2.5 text-12 uppercase text-[var(--text-2)]">
        <span aria-hidden className="cr-brand">
          {ic}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function PersonRow({ p, alt }: { p: Person; alt?: boolean }) {
  return (
    <div className="cr-row flex items-center gap-3 py-2 pl-2.5 pr-2">
      <span
        aria-hidden
        className={`cr-fillbg grid size-11 shrink-0 place-items-center rounded-full text-15 font-bold ${alt ? 'cr-alt' : ''}`}
      >
        {initials(p.name)}
      </span>
      <div className="min-w-0 flex-1 text-16 font-semibold leading-tight [overflow-wrap:anywhere]">
        {p.name}
      </div>
      <a
        href={instagramUrl(p.instagram)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.hub.credits.instagramOf(p.name)}
        className={`${LINK} cr-ig relative min-h-11 shrink-0 rounded-full px-3 font-mono text-12`}
      >
        <span className="text-[var(--text-2)]">@</span>
        {p.instagram}
      </a>
    </div>
  );
}

export function CreditsPage() {
  const dev = credits.developer;
  const share = canShareLink() && (
    <IconButton
      chrome
      label={t.hub.credits.share}
      onClick={() => void shareLink(location.origin, t.hub.credits.shareText)}
    >
      {Icon.share}
    </IconButton>
  );
  return (
    <Page title={t.hub.nav.credits} actions={share || undefined}>
      <div className="cr relative">
        <div aria-hidden className="cr-wall" />
        {fs('spade', { '--r': '-14deg', left: 2, top: 20, width: 34, height: 34 } as CSSProperties)}
        {fs('diamond', {
          '--r': '18deg',
          right: 6,
          top: 80,
          width: 28,
          height: 28,
          animationDelay: '-3s',
        } as CSSProperties)}
        {fs('heart', {
          '--r': '8deg',
          left: 14,
          top: 220,
          width: 24,
          height: 24,
          animationDelay: '-5s',
        } as CSSProperties)}
        {fs('club', {
          '--r': '-6deg',
          right: 18,
          top: 250,
          width: 30,
          height: 30,
          animationDelay: '-1.5s',
        } as CSSProperties)}

        <div className="cr-stage">
          <div aria-hidden className="cr-halo" />
          <Sparkle style={{ '--d': '0s', left: '30%', top: 52 } as CSSProperties} />
          <Sparkle
            style={{ '--d': '.9s', right: '28%', top: 84, width: 10, height: 10 } as CSSProperties}
          />
          <Sparkle
            style={
              { '--d': '1.7s', left: '32%', bottom: 46, width: 11, height: 11 } as CSSProperties
            }
          />
          <Sparkle style={{ '--d': '.4s', right: '30%', bottom: 64 } as CSSProperties} />
          <div className="cr-card" role="img" aria-label={t.hub.credits.cardLabel}>
            <div className="cr-pip" style={{ left: 12, top: 12 }}>
              J
              <Suit s="heart" />
            </div>
            <div className="cr-bigj" aria-hidden>
              J
            </div>
            <div className="cr-dealer" aria-hidden>
              {t.hub.credits.dealer}
            </div>
            <div className="cr-pip" style={{ right: 12, bottom: 12, transform: 'rotate(180deg)' }}>
              J
              <Suit s="heart" />
            </div>
            <div className="cr-sheen" />
          </div>
        </div>

        <section className="px-5 text-center">
          <p className="mono-label text-12 uppercase text-[var(--text-2)]">{t.hub.credits.by}</p>
          <h2 className="cr-nm" data-t={dev.name}>
            {dev.name}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {dev.instagram && (
              <a
                href={instagramUrl(dev.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${LINK} min-h-11 rounded-full py-1 pl-1.5 pr-4`}
              >
                <span
                  aria-hidden
                  className="cr-fillbg grid size-8 place-items-center rounded-full font-mono text-15 font-bold"
                >
                  @
                </span>
                {dev.instagram}
              </a>
            )}
            <a
              href={`https://${dev.site}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} min-h-11 rounded-full py-1 pl-1.5 pr-4`}
            >
              <span aria-hidden className="cr-fillbg grid size-8 place-items-center rounded-full">
                {icon('globe', 'h-4 w-4')}
              </span>
              {dev.site}
            </a>
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-7">
          <Box d="0.3s" icon={Icon.palette} title={t.hub.credits.design}>
            {credits.design.map((p, i) => (
              <PersonRow key={i} p={p} />
            ))}
          </Box>
          <Box d="0.4s" icon={icon('eye', 'h-4 w-4')} title={t.hub.credits.tested}>
            {credits.testers.map((p, i) => (
              <PersonRow key={i} p={p} alt={i % 2 === 1} />
            ))}
          </Box>
          {credits.thanks.length > 0 && (
            <Box d="0.5s" icon={Icon.heart} title={t.hub.credits.thanks}>
              <ul className="flex flex-wrap gap-2 px-2.5 pb-3 pt-1.5">
                {credits.thanks.map((n, i) => (
                  <li
                    key={i}
                    className="cr-pill inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-14 font-semibold"
                    style={{ '--i': i } as CSSProperties}
                  >
                    <Suit s="heart" className="cr-red size-3" />
                    {n}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </div>

        <footer className="px-5 pb-6 pt-10 text-center">
          <p className="cr-big disp text-40 italic leading-none">{t.hub.credits.footer}</p>
          <div aria-hidden className="my-4 flex justify-center gap-3.5">
            {(['spade', 'heart', 'club', 'diamond'] as Suit[]).map((s, i) => (
              <Suit
                key={s}
                s={s}
                className={`cr-bob ${i % 2 ? 'cr-red' : ''}`}
                style={{ '--i': i } as CSSProperties}
              />
            ))}
          </div>
          <p className="mono-label text-12 uppercase text-[var(--text-3)]">
            {t.hub.credits.app} · v{version}
          </p>
        </footer>
      </div>
    </Page>
  );
}
