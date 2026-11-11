/**
 * Every colour name the app uses, mapped to the theme variable that paints it (src/styles/themes.css). Tailwind and
 * `palette` both read this, so a class, an inline style and a canvas all follow the active theme.
 */
export const COLOR_VARS = {
  // Theme roles (docs/codebase/DESIGN-SYSTEM.md).
  bg: 'bg',
  'surface-1': 'surface-1',
  'surface-2': 'surface-2',
  'surface-3': 'surface-3',
  panel: 'panel',
  hairline: 'hairline',
  'hairline-2': 'hairline-2',
  'text-1': 'text-1',
  'text-2': 'text-2',
  'text-3': 'text-3',
  brand: 'brand',
  'on-brand': 'on-brand',
  success: 'success',
  danger: 'danger',
  ink: 'ink',
  /** White on the dark theme, ink on the light ones: tints, hairlines and pressed states. */
  ov: 'ov',
  shade: 'shade',
  // Platform: game accents, Ishaara's teams and word cards, Kaali Teeri's bidding team, the coming-soon badge.
  'game-kachuful': 'game-kachuful',
  'game-kaali-teeri': 'game-kaali-teeri',
  'game-ishaara': 'game-ishaara',
  'team-sun': 'team-sun',
  'team-sun-ink': 'team-sun-ink',
  'team-moon': 'team-moon',
  'team-moon-ink': 'team-moon-ink',
  'word-card': 'word-card',
  'word-card-ink': 'word-card-ink',
  'word-blank': 'word-blank',
  'word-blank-ink': 'word-blank-ink',
  'word-trap': 'word-trap',
  'word-trap-ink': 'word-trap-ink',
  'word-edge': 'word-edge',
  'kt-bid': 'kt-bid',
  'kt-bid-ink': 'kt-bid-ink',
  'soon-bg': 'soon-bg',
  'soon-ink': 'soon-ink',
  'soon-edge': 'soon-edge',
  // Names from before themes, kept so existing classes keep working.
  'felt-950': 'bg',
  'felt-900': 'surface-1',
  'felt-800': 'surface-2',
  'felt-table': 'felt-hi',
  'text-primary': 'text-1',
  'text-secondary': 'text-2',
  'text-disabled': 'text-3',
  'text-placeholder': 'text-3',
  'gold-light': 'medal-gold-hi',
  'gold-mid': 'medal-gold',
  'gold-dark': 'medal-gold-lo',
  gold: 'medal-gold',
  positive: 'success',
  negative: 'danger',
  'negative-text': 'danger',
  warning: 'warning',
  'accent-spades': 'trump-spades',
  'accent-diamonds': 'trump-diamonds',
  'accent-clubs': 'trump-clubs',
  'accent-hearts': 'trump-hearts',
  'suit-black': 'suit-black',
  'suit-red': 'suit-red',
  'rank-silver': 'medal-silver',
  'rank-bronze': 'medal-bronze',
  'ink-on-accent': 'on-brand',
  'ink-gold': 'on-gold',
  'ink-podium': 'on-gold',
  'ink-negative': 'on-danger',
  sheet: 'sheet-bg',
  toast: 'toast-bg',
  'surface-solid': 'surface-2',
  'tx-rules': 'text-1',
  'card-face': 'card-bg',
  'card-ink': 'card-fg',
  'card-red': 'card-red',
  'podium-silver-light': 'medal-silver-hi',
  'podium-silver-dark': 'medal-silver-lo',
  'podium-bronze-light': 'medal-bronze-hi',
  'podium-bronze-dark': 'medal-bronze-lo',
  'share-ink': 'share-ink',
} as const;

export type ColorName = keyof typeof COLOR_VARS;

/** Gradients by name; every stop is a theme variable. */
export const GRADIENTS = {
  'gold-gradient':
    'linear-gradient(135deg, var(--medal-gold-hi), var(--medal-gold) 55%, var(--medal-gold-lo))',
  'gold-gradient-v': 'linear-gradient(var(--medal-gold-hi), var(--medal-gold-lo))',
  'silver-gradient-v': 'linear-gradient(var(--medal-silver-hi), var(--medal-silver-lo))',
  'bronze-gradient-v': 'linear-gradient(var(--medal-bronze-hi), var(--medal-bronze-lo))',
  // A theme with deck art paints it over the stripes (pair with `.card-art` to size it); the others set it to none.
  'card-back':
    'var(--art-back), repeating-linear-gradient(45deg, var(--card-back-a), var(--card-back-a) 6px, var(--card-back-b) 6px, var(--card-back-b) 12px)',
  'card-deal':
    'var(--art-back-mini), repeating-linear-gradient(45deg, var(--card-back-a), var(--card-back-a) 3px, var(--medal-gold) 3px, var(--medal-gold) 4px)',
  'accent-gradient': 'var(--fill-primary)',
} as const;
