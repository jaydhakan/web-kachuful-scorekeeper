import { fireEvent, render, screen } from '@testing-library/react';
import { t } from '@/strings';
import { UpdateGate } from './UpdateGate';

test('the update gate has one way out: reloading', () => {
  const onReload = vi.fn();
  render(<UpdateGate onReload={onReload} />);
  const dialog = screen.getByRole('alertdialog');
  const titles = t.update.lines.map((l) => l.title);
  expect(titles).toContain(screen.getByRole('heading').textContent);
  expect(dialog).toHaveAccessibleName(screen.getByRole('heading').textContent!);

  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(1);

  const btn = screen.getByRole('button', { name: t.update.reload });
  expect(btn).toHaveFocus();
  fireEvent.click(btn);
  expect(onReload).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: t.update.reloading })).toBeDisabled();
});
