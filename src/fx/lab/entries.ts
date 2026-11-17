import { FOUNDATIONS } from './foundations';
import { PLATFORM } from './platform';
import { SPADES } from './spades';
import type { LabEntry } from './registry';

export const ENTRIES: LabEntry[] = [...FOUNDATIONS, ...PLATFORM, ...SPADES];
