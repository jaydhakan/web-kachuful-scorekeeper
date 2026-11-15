import type { ReactElement } from 'react';
import { home as h } from '@/games/spades/strings/home';
import { Soon } from '@/games/spades/screens/Soon';
import type { TablePage } from '@/games/spades/nav';

// Placeholder owned by the table-mode agent: the scorekeeper replaces this body (plan §2.6); `page` opens a page.
const TableApp: (props: { page: TablePage | null }) => ReactElement | null = () => (
  <Soon title={h.soon.table} body={h.soon.tableBody} />
);
export default TableApp;
