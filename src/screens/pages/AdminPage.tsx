import { useState } from 'react';
import { useApp } from '@/state/store';
import { Chip, ChipRow, EmptyState, Page } from '@/components/ui/Page';
import { AppearancePanel } from './AppearancePanel';
import { MergeCompare } from './admin/MergeCompare';
import { Overview } from './admin/Overview';
import { People } from './admin/People';
import { Players } from './admin/Players';
import { ad } from './admin/shared';
import { t } from '@/strings';

type Tab = 'overview' | 'people' | 'players' | 'settings';

/** Overview first (what needs the admin), then people, players and the app-wide settings. */
export function AdminPage() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [compare, setCompare] = useState<{ a: string; b: string } | null>(null);
  // Bumped after a merge so the open tab loads again.
  const [gen, setGen] = useState(0);
  if (state.session?.user.role !== 'admin')
    return (
      <Page title={ad.title}>
        <EmptyState icon="locked" title={t.hub.auth.errors.server} />
      </Page>
    );
  const tabs: [Tab, string][] = [
    ['overview', ad.overview],
    ['people', ad.people],
    ['players', ad.players],
    ['settings', ad.settings],
  ];
  return (
    <>
      <Page
        title={ad.title}
        sub={
          <ChipRow label={ad.tabs}>
            {tabs.map(([k, label]) => (
              <Chip key={k} on={tab === k} onClick={() => setTab(k)}>
                {label}
              </Chip>
            ))}
          </ChipRow>
        }
      >
        <div key={tab + gen}>
          {tab === 'overview' ? (
            <Overview
              onPeople={() => setTab('people')}
              onCompare={(a, b) => setCompare({ a: a.id, b: b.id })}
            />
          ) : tab === 'people' ? (
            <People />
          ) : tab === 'players' ? (
            <Players onCompare={(a, b) => setCompare({ a, b })} />
          ) : (
            <AppearancePanel />
          )}
        </div>
      </Page>
      {/* Beside the page, not in it: the page's scroll area fades its top edge, which would hide a tall sheet's title. */}
      {compare && (
        <MergeCompare
          aId={compare.a}
          bId={compare.b}
          onClose={() => setCompare(null)}
          onMerged={() => (setCompare(null), setGen((g) => g + 1))}
        />
      )}
    </>
  );
}
