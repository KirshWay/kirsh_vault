import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';

import { StarRating } from './StarRating';

test('rating can be selected and cleared with the keyboard', async () => {
  function Rating() {
    const [value, setValue] = useState(0);
    return <StarRating value={value} onChange={setValue} maxValue={5} />;
  }
  render(<Rating />);
  const user = userEvent.setup();
  const star = screen.getByRole('button', { name: 'Rate 3 out of 5' });
  star.focus();
  await user.keyboard('{Enter}');
  expect(star).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('3/5')).toBeInTheDocument();
  await user.keyboard(' ');
  expect(screen.getByText('0/5')).toBeInTheDocument();
});

test('read-only ratings do not add focusable controls', () => {
  render(<StarRating value={8} readonly />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Rating: 8 out of 10')).toBeInTheDocument();
});
