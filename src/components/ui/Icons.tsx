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
  home: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  cards: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M5 6h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M9 6V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4" />
    </svg>
  ),
  scores: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" aria-hidden>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  ),
  rules: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h10" />
    </svg>
  ),
  rounds: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M4 10h16 M9 3v4 M15 3v4" />
    </svg>
  ),
  undo: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
  check: (
    <svg
      {...base}
      className="h-[22px] w-[22px]"
      strokeWidth="2.4"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  ),
  warn: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 4l9 16H3z M12 10v4 M12 17h.01" />
    </svg>
  ),
  lockLg: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px] fill-gold" aria-hidden>
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
    </svg>
  ),
  trophy: (
    <svg {...base} className="h-full w-full" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v2a3 3 0 0 0 3 3 M17 6h3v2a3 3 0 0 1-3 3 M12 14v4 M8 20h8" />
    </svg>
  ),
  grip: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="3" aria-hidden>
      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
    </svg>
  ),
  keyboard: (
    <svg {...base} className="h-[22px] w-[22px]" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
    </svg>
  ),
  arrow: (
    <svg {...base} className="h-5 w-5" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
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
