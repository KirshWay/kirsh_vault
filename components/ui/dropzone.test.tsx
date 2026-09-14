import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { pngFile } from '@/tests/helpers/image';

import { Dropzone } from './dropzone';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function upload(files: File[], images: string[] = []) {
  const onChange = vi.fn();
  const { container } = render(<Dropzone images={images} onChange={onChange} maxFiles={5} />);
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files } });
  return onChange;
}

function decodingSucceeds(width = 1, height = 1) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close: vi.fn() }))
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/webp;base64,b3B0aW1pemVk'
  );
}

function EditableImages({ initialImages }: { initialImages: string[] }) {
  const [images, setImages] = useState(initialImages);
  return <Dropzone images={images} onChange={setImages} />;
}

test('the image count and upload availability update after removing an image at the limit', async () => {
  const user = userEvent.setup();
  render(
    <EditableImages
      initialImages={['/one.png', '/two.png', '/three.png', '/four.png', '/five.png']}
    />
  );
  expect(screen.getByRole('status')).toHaveTextContent('5 of 5 images');
  expect(screen.getByRole('button', { name: 'Add more images' })).toHaveAttribute(
    'aria-disabled',
    'true'
  );
  expect(screen.getByLabelText('Choose images')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Remove image 2' }));
  expect(screen.getAllByRole('img').map((image) => image.getAttribute('src'))).toEqual([
    '/one.png',
    '/three.png',
    '/four.png',
    '/five.png',
  ]);
  expect(screen.getByRole('status')).toHaveTextContent('4 of 5 images');
  expect(screen.getByRole('button', { name: 'Add more images' })).toHaveAttribute(
    'aria-disabled',
    'false'
  );
  expect(screen.getByLabelText('Choose images')).toBeEnabled();
});

test('keyboard deletion of the final image returns focus to the upload control', async () => {
  const user = userEvent.setup();
  render(<EditableImages initialImages={['/one.png']} />);
  screen.getByRole('button', { name: 'Remove image 1' }).focus();
  await user.keyboard('{Enter}');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add images' })).toHaveFocus();
});

test('keyboard navigation follows the upload control into the image strip', async () => {
  const user = userEvent.setup();
  render(<EditableImages initialImages={['/one.png']} />);
  act(() => screen.getByRole('button', { name: 'Add more images' }).focus());
  await user.tab();
  expect(screen.getByRole('list', { name: 'Selected images' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Remove image 1' })).toHaveFocus();
});

test('adding two files to four images never exceeds the five-image limit', async () => {
  decodingSucceeds();
  const onChange = upload([pngFile(), pngFile()], ['1', '2', '3', '4']);
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(onChange.mock.lastCall?.[0]).toHaveLength(5);
});

test('valid files are retained when another file in the same selection is rejected', async () => {
  decodingSucceeds();
  const onChange = upload([pngFile(), new File(['text'], 'a.txt', { type: 'text/plain' })]);
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(onChange.mock.lastCall?.[0]).toHaveLength(1);
});

test('images are resized before they are stored', async () => {
  decodingSucceeds(2400, 1200);
  const onChange = upload([pngFile(2400, 1200)]);
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(onChange.mock.lastCall?.[0]).toEqual(['data:image/webp;base64,b3B0aW1pemVk']);
  const canvas = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.instances[0];
  expect(canvas).toMatchObject({ width: 1600, height: 800 });
});

test('unreadable images show an error and do not enter the form', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('Invalid image')));
  const onChange = upload([new File(['broken'], 'broken.png', { type: 'image/png' })]);
  expect(await screen.findByRole('alert')).toHaveTextContent(/broken.png/);
  expect(onChange).not.toHaveBeenCalled();
});
