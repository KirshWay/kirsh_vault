import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';

import { ItemFormModal } from './ItemFormModal';

function Harness({ save }: { save: () => Promise<boolean> }) {
  const [open, setOpen] = useState(true);
  return (
    <ItemFormModal
      isOpen={open}
      onOpenChange={setOpen}
      title="Edit Item"
      defaultValues={{ name: 'Draft', category: 'book', images: ['/image.png'] }}
      onSubmit={save}
    />
  );
}

test.each([true, false])(
  'a pending save blocks dismissal and all editing until it settles (%s)',
  async (success) => {
    let finish!: (saved: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    const user = userEvent.setup();
    render(<Harness save={() => pending} />);
    await user.click(screen.getByRole('button', { name: 'Update Item' }));
    await screen.findByRole('button', { name: 'Saving…' });
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Description')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rate 5 out of 10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove image 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add more images' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    fireEvent.pointerDown(document.body, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      finish(success);
    });
    if (success) await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    else {
      expect(screen.getByLabelText('Name')).toHaveValue('Draft');
      expect(screen.getByLabelText('Name')).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
  }
);

test('completion from an unmounted form cannot close its replacement', async () => {
  let finish!: (saved: boolean) => void;
  const pending = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const user = userEvent.setup();
  function Replacement({ session }: { session: number }) {
    const [open, setOpen] = useState(true);
    return (
      <ItemFormModal
        key={session}
        isOpen={open}
        onOpenChange={setOpen}
        title="Edit Item"
        defaultValues={{ name: 'Replacement draft' }}
        onSubmit={() => pending}
      />
    );
  }
  const view = render(<Replacement session={1} />);
  await user.click(screen.getByRole('button', { name: 'Update Item' }));
  await screen.findByRole('button', { name: 'Saving…' });
  view.rerender(<Replacement session={2} />);
  await user.clear(screen.getByLabelText('Name'));
  await user.type(screen.getByLabelText('Name'), 'Keep replacement draft');
  await act(async () => {
    finish(true);
  });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Keep replacement draft');
});
