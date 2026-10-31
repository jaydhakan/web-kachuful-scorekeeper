import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the type parameter must match React's declaration
  interface HTMLAttributes<T> {
    /** Removes the subtree from focus and the accessibility tree. */
    inert?: '' | undefined;
  }
}
