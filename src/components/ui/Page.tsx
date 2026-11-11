import { useApp } from '@/games/kachuful/state/store';
import { PageFrame, type PageProps } from './PageParts';

export * from './PageParts';

/** Kachuful's page: the shared frame with Back popping its nav stack. */
export function Page(props: Omit<PageProps, 'onBack'>) {
  const { actions } = useApp();
  return <PageFrame onBack={actions.back} {...props} />;
}
