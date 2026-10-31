import type { ReactElement } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
};

export const Icon: Record<string, ReactElement> = {
  menu: (
    <svg {...base} className="h-6 w-6" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  back: (
    <svg {...base} className="h-6 w-6" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  board: (
    <svg {...base} className="h-6 w-6" strokeWidth="2" aria-hidden>
      <path d="M5 20V11M12 20V4M19 20v-6" />
    </svg>
  ),
  close: (
    <svg {...base} className="h-5 w-5" strokeWidth="2.2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  edit: (
    <svg {...base} className="h-6 w-6" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    </svg>
  ),
  lock: (
    <svg {...base} className="h-3.5 w-3.5" strokeWidth="2.4" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  ),
  share: (
    <svg {...base} className="h-5 w-5" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
    </svg>
  ),
  deck: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
      <rect
        x="3"
        y="6"
        width="12"
        height="15"
        rx="2"
        fill="none"
        className="stroke-ink-gold"
        strokeWidth="2.6"
      />
      <rect x="9" y="3" width="12" height="15" rx="2" className="fill-ink-gold" />
    </svg>
  ),
};
