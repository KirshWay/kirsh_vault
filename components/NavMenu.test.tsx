import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { NavMenu } from './NavMenu';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

test('Escape closes mobile navigation and restores focus to its toggle', async () => {
  const user = userEvent.setup();
  render(<NavMenu />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
  within(navigation).getByRole('link', { name: 'Books' }).focus();
  await user.keyboard('{Escape}');
  expect(navigation).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveFocus();
});

test('clicking outside closes mobile navigation without stealing focus', async () => {
  const user = userEvent.setup();
  render(
    <>
      <NavMenu />
      <button>Outside</button>
    </>
  );
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(navigation).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
});

test('tabbing past the last mobile link closes navigation', async () => {
  const user = userEvent.setup();
  render(
    <>
      <NavMenu />
      <button>Outside</button>
    </>
  );
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
  within(navigation).getAllByRole('link').at(-1)!.focus();
  await user.tab();
  expect(navigation).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
});
