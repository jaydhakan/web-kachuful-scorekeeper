import type { SpRules } from '../domain';

export interface RulesLineProps {
  rules: SpRules;
  /** Online only; table mode has no timer. */
  online: boolean;
  /** "Edit rules ›" for the host or the scorer, "View ›" for a guest. */
  editable: boolean;
  onOpen: () => void;
}

/** The one-line rules summary ("200 points · Nil · 30 s turns") with its Edit or View link. Owned by the online-lobby agent. */
export default function RulesLine(props: RulesLineProps) {
  void props;
  return null;
}
