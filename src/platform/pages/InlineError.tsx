import { icon } from '@/components/ui/IconsMore';

/**
 * A failure shown beside the control that caused it, in the danger colour with a mark (never colour alone), and
 * announced. Toasts stay for successes.
 */
export function InlineError({ msg, className = '' }: { msg: string; className?: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 text-15 font-semibold text-[var(--neg-tx)] ${className}`}
    >
      <span aria-hidden className="mt-0.5 shrink-0">
        {icon('warn', 'h-4 w-4')}
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{msg}</span>
    </p>
  );
}
