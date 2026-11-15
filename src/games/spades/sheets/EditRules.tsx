import type { SpRules } from '../domain';

export interface EditRulesProps {
  rules: SpRules;
  /** The table's name (online only). */
  name?: string;
  /** False shows the same sheet read-only (a guest at someone else's table). */
  editable: boolean;
  /** Called on every change, so the summary line updates live. */
  onChange: (rules: SpRules, name?: string) => void;
  onClose: () => void;
  /** Online only: who may change these, for the read-only line. */
  hostName?: string;
  /** Table mode hides the turn timer. */
  online: boolean;
}

/** The Edit rules sheet body: Game, Bidding, Ending, Reset to standard (plan §2.2). Owned by the online-lobby agent. */
export default function EditRules(props: EditRulesProps) {
  void props;
  return null;
}
