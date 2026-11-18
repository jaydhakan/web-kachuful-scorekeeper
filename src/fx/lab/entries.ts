import { FOUNDATIONS } from './foundations';
import { PLATFORM } from './platform';
import { KAALI_TEERI } from './kaaliTeeri';
import { SPADES } from './spades';
import type { LabEntry } from './registry';

export const ENTRIES: LabEntry[] = [...FOUNDATIONS, ...PLATFORM, ...SPADES, ...KAALI_TEERI];
