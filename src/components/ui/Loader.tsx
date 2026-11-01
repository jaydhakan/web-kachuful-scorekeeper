import { t } from '@/strings';

/**
 * The squash-and-stretch loader (DESIGN-SYSTEM.md, Motion) for a screen still downloading. It stays invisible for the
 * first 300ms, so a quick load shows nothing at all. No percentage: nothing reports real progress, and a made-up
 * number would mislead.
 */
export function Loader() {
  return (
    <div
      role="status"
      className="sq-loader absolute inset-0 grid place-content-center justify-items-center gap-3"
    >
      <div aria-hidden className="relative h-20 w-10">
        <span className="sq-shadow absolute bottom-0 left-0 h-2 w-10 rounded-[50%] bg-shade/40" />
        <span className="sq-ball absolute left-[3px] top-0 h-[34px] w-[34px] rounded-full bg-[var(--fill-primary)] shadow-[inset_-5px_-5px_0_color-mix(in_srgb,var(--shade)_18%,transparent)]" />
      </div>
      <span className="mono-label text-13 text-[var(--tx2)]">{t.common.loading}</span>
    </div>
  );
}
