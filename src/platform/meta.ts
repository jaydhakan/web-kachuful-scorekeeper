import { platform } from '../strings/platform';
import { GAME_IDS, type GameId } from './route';

/** Absolute, because link previews (WhatsApp, iMessage, Slack) don't resolve relative URLs. */
export const ORIGIN = 'https://play.vectanix.com';

/** What one HTML page tells browsers, installers and preview bots before any script runs. */
export interface PageMeta {
  /** The built file: 'index.html' or '<game>/index.html'. */
  file: string;
  path: string;
  title: string;
  appTitle: string;
  description: string;
  image: string;
  touchIcon: string;
}

const game = (id: GameId): PageMeta => {
  const g = platform.games[id];
  return {
    file: `${id}/index.html`,
    path: `/${id}`,
    title: `${g.name} · ${platform.name}`,
    appTitle: g.name,
    description: g.description,
    image: `/games/${id}/og-image.png`,
    touchIcon: `/games/${id}/apple-touch-icon.png`,
  };
};

/** The landing page and one page per game; vite.config.ts writes each from index.html. */
export const PAGES: readonly PageMeta[] = [
  {
    file: 'index.html',
    path: '/',
    title: platform.name,
    appTitle: platform.name,
    description: platform.description,
    image: '/og-image.png',
    touchIcon: '/apple-touch-icon.png',
  },
  ...GAME_IDS.map(game),
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The head tags for one page, replacing the `<!-- page-meta -->` marker in index.html. */
export function metaTags(p: PageMeta): string {
  const url = ORIGIN + p.path;
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${esc(p.appTitle)}" />`,
    `<link rel="apple-touch-icon" href="${p.touchIcon}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(platform.name)}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${ORIGIN + p.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
}
