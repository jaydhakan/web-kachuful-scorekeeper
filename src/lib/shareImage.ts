import { doneRounds, standings, type Game } from '@/domain';
import { fmt } from '@/lib/format';
import { palette } from '@/theme/palette';

const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';
const SANS = '"DM Sans Variable", system-ui, sans-serif';

/** Draws the final-scores card (1080×1350). Fonts must be loaded first or the canvas falls back silently. */
export async function drawShareCanvas(g: Game): Promise<HTMLCanvasElement> {
  await Promise.all(
    ['800 96px ' + DISPLAY, '500 34px ' + SANS, '700 28px ' + SANS].map((f) =>
      document.fonts.load(f).catch(() => []),
    ),
  );
  const st = standings(g),
    c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const x = c.getContext('2d');
  if (!x) return c;
  const bg = x.createRadialGradient(540, 0, 50, 540, 300, 1200);
  bg.addColorStop(0, palette['felt-800']);
  bg.addColorStop(1, palette['felt-950']);
  x.fillStyle = bg;
  x.fillRect(0, 0, 1080, 1350);
  x.textAlign = 'center';
  const gd = x.createLinearGradient(300, 0, 780, 0);
  gd.addColorStop(0, palette['gold-light']);
  gd.addColorStop(0.5, palette['gold-mid']);
  gd.addColorStop(1, palette['gold-dark']);
  x.fillStyle = gd;
  x.font = '800 96px ' + DISPLAY;
  x.fillText('Kachuful', 540, 130);
  x.fillStyle = palette['text-secondary'];
  x.font = '500 34px ' + SANS;
  x.fillText(`${doneRounds(g).length} rounds · final scores`, 540, 185);
  (
    [
      [2, 150, 230],
      [1, 420, 330],
      [3, 690, 160],
    ] as const
  ).forEach(([k, px, hh]) => {
    const m = st.filter((s) => s.rank === k),
      cx = px + 120,
      top = 740 + 330 - hh;
    x.fillStyle =
      k === 1 ? palette['gold-mid'] : k === 2 ? palette['rank-silver'] : palette['rank-bronze'];
    x.beginPath();
    x.roundRect(px, top, 240, hh, 18);
    x.fill();
    x.fillStyle = palette['share-ink'];
    x.font = '800 72px ' + DISPLAY;
    x.fillText(k === 1 ? '1st' : k === 2 ? '2nd' : '3rd', cx, top + 84);
    m.slice(0, 2).forEach((s, j) => {
      const ax = cx + (m.length > 1 ? (j ? 55 : -55) : 0),
        ay = top - 70;
      x.fillStyle = s.p.color;
      x.beginPath();
      x.arc(ax, ay, 46, 0, 7);
      x.fill();
      x.font = '56px sans-serif';
      x.fillStyle = 'black';
      x.fillText(s.p.emoji, ax, ay + 19);
      x.fillStyle = palette['text-primary'];
      x.font = '700 30px ' + SANS;
      x.fillText(s.p.name.slice(0, 9), ax, ay - 62);
    });
  });
  st.slice(0, 7).forEach((s, i) => {
    const yy = 1110 + i * 38;
    x.textAlign = 'left';
    x.fillStyle = palette['text-primary'];
    x.font = '700 28px ' + SANS;
    x.fillText(`${s.rank}.  ${s.p.emoji}  ${s.p.name.slice(0, 12)}`, 220, yy);
    x.textAlign = 'right';
    x.fillStyle = s.t < 0 ? palette.negative : palette.positive;
    x.fillText(fmt(s.t), 860, yy);
  });
  return c;
}
