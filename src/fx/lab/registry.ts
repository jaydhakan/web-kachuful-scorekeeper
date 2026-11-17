import type { ComponentType } from 'react';
import type { MomentTier } from '../moments';

/**
 * One moment in the lab (WOW-MOMENTS-PLAN §3.5). `Demo` mounts fresh on every replay inside a stage that has a
 * MomentsProvider, and plays on mount; the lab's switches (speed, reduced motion, theme, size) apply around it.
 */
export interface LabEntry {
  id: string;
  group: 'Foundations' | 'Platform' | 'Spades' | 'Kaali Teeri' | 'Ishaara';
  title: string;
  tier: MomentTier;
  /** What to look for. */
  note?: string;
  Demo: ComponentType;
}
