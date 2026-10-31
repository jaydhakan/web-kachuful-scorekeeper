import tokens from './tokens.json';
import extended from './extended.json';

type TokenName = (typeof tokens.color.tokens)[number]['name'];

/** Every design-system colour by token name (Midnight Card Room). */
export const palette = {
  ...Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value.midnight])),
  ...extended.colors,
} as Record<TokenName | keyof typeof extended.colors, string>;

export const gradients = extended.backgroundImage;
