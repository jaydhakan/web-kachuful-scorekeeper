export * from './types';
export * from './avatars';
export * from './cards';
export * from './rounds';
export * from './bidding';
export * from './scoring';
export * from './standings';
export * from './stats';
export * from './demo';

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
