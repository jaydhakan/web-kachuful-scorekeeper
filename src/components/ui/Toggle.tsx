import { m } from 'framer-motion';
import { SPRING_POP } from './motion';

/**
 * The switch's track and knob. The control around it is a `role="switch"` button with `whileTap="press"`, which this
 * track answers with its own press. The "on" fill cross-fades, so colours never animate; each theme paints it.
 */
export function ToggleTrack({ on }: { on: boolean }) {
  return (
    <m.span
      aria-hidden
      variants={{ press: { scale: 0.94 } }}
      className="mat-tog relative h-[30px] w-[52px] shrink-0 rounded-full"
    >
      <span
        className={`mat-tog-on absolute inset-0 rounded-[inherit] transition-opacity duration-300 ease-apple ${on ? '' : 'opacity-0'}`}
      />
      <m.span
        animate={{ x: on ? 22 : 0 }}
        transition={SPRING_POP}
        className={`mat-knob absolute left-[3px] top-[3px] h-6 w-6 rounded-full ${on ? 'is-on' : ''}`}
      />
    </m.span>
  );
}
