import { expect, type Locator, type Page, test } from '@playwright/test';

async function addPhotoCollection(page: Page, count = 5) {
  await page.goto('./');
  const images = await page.evaluate((count) => {
    return [
      [160, 1600],
      [1600, 160],
      [800, 800],
      [600, 1200],
      [1200, 600],
    ]
      .slice(0, count)
      .map(([width, height], index) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = ['#eac58f', '#9ccadc', '#b7cda3', '#deb5b9', '#c0b5dd'][index];
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#302c29';
        ctx.font = '24px sans-serif';
        ctx.fillText(`${width} × ${height}`, 12, 40);
        for (let y = 100; y < height; y += 100) ctx.fillRect(12, y, width - 24, 3);
        return canvas.toDataURL('image/png').split(',')[1];
      });
  }, count);
  await page.getByRole('button', { name: 'Add First Item', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Gallery proportions');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add images', exact: true }).click();
  await (
    await chooser
  ).setFiles(
    images.map((data, index) => ({
      name: `photo-${index}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from(data, 'base64'),
    }))
  );
  await expect(page.getByRole('status')).toContainText(`${count} of 5 images`);
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
}

async function expectInsideViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test('keeps tall photos and all five thumbnails inside desktop and mobile viewports', async ({
  page,
}, testInfo) => {
  await addPhotoCollection(page);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 375, height: 568 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: /image viewer/i });
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished)
      );
    });
    await expectInsideViewport(
      dialog
        .getByRole('region', { name: 'Photo gallery' })
        .locator('[role="group"]:not([inert])')
        .getByRole('img', { name: 'Image 1', exact: true }),
      page
    );
    const thumbnails = dialog.locator('button:has(img)');
    await expect(thumbnails).toHaveCount(5);
    for (const thumbnail of await thumbnails.all()) await expectInsideViewport(thumbnail, page);
    await expectInsideViewport(dialog.getByRole('button', { name: 'Close', exact: true }), page);
    await page.screenshot({ path: testInfo.outputPath(`gallery-${viewport.width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
});

test('keeps keyboard focus inside the gallery and returns it to the opening thumbnail', async ({
  page,
}) => {
  await addPhotoCollection(page);
  await page.getByRole('button', { name: 'Expand Gallery proportions' }).click();
  const trigger = page.getByRole('button', {
    name: 'View image 3 for Gallery proportions',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /image viewer/i });
  const currentSlide = dialog
    .getByRole('region', { name: 'Photo gallery' })
    .locator('[role="group"]:not([inert])');
  await expect(currentSlide.getByRole('img', { name: 'Image 3', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(currentSlide.getByRole('img', { name: 'Image 4', exact: true })).toBeVisible();
  // Exercise both focus-loop boundaries.
  const firstControl = dialog.getByRole('button', { name: 'Zoom in', exact: true });
  const lastControl = dialog.getByRole('button', { name: 'View image 5', exact: true });
  await expect(firstControl).toBeEnabled();
  await lastControl.focus();
  await page.keyboard.press('Tab');
  await expect(firstControl).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(lastControl).toBeFocused();
  await lastControl.press('Enter');
  await expect(currentSlide.getByRole('img', { name: 'Image 5', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(currentSlide.getByRole('img', { name: 'Image 3', exact: true })).toBeVisible();
});

for (const count of [1, 2]) {
  test(`shows ${count} photos without repeated or unnecessary thumbnails`, async ({ page }) => {
    await addPhotoCollection(page, count);
    await page
      .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: /image viewer/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('button:has(img)')).toHaveCount(count === 1 ? 0 : 2);
    if (count === 1) {
      await expect(dialog.getByRole('button', { name: 'Next image', exact: true })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
    }
  });
}

test('opens and zooms offline even if the gallery has never been opened before', async ({
  page,
  context,
}) => {
  await addPhotoCollection(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
  await context.setOffline(true);
  expect(
    await page.evaluate(() =>
      fetch('uncached-gallery-probe', { cache: 'no-store' })
        .then(() => false)
        .catch(() => true)
    )
  ).toBe(true);
  await page.reload();
  await page
    .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: /image viewer/i });
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Fit image', exact: true })).toBeEnabled();
});

test('zooms a portrait, pans it, fits it again and resets zoom when changing images', async ({
  page,
}) => {
  await addPhotoCollection(page);
  await page
    .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: /image viewer/i });
  const image = dialog
    .getByRole('region', { name: 'Photo gallery' })
    .locator('[role="group"]:not([inert])')
    .getByRole('img', { name: 'Image 1', exact: true });
  const fit = dialog.getByRole('button', { name: 'Fit image', exact: true });
  await expect(fit).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  const fitted = await image.boundingBox();
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(fit).toBeEnabled();
  await expect
    .poll(async () => (await image.boundingBox())!.height)
    .toBeGreaterThan(fitted!.height * 1.5);
  const zoomed = await image.boundingBox();
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewport.width / 2, viewport.height / 2 - 80, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await image.boundingBox())!.y).toBeLessThan(zoomed!.y - 30);
  await fit.click();
  await expect(fit).toBeDisabled();
  await expect
    .poll(async () => Math.abs((await image.boundingBox())!.height - fitted!.height))
    .toBeLessThan(2);
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(fit).toBeDisabled();
  await expectInsideViewport(
    dialog
      .getByRole('region', { name: 'Photo gallery' })
      .locator('[role="group"]:not([inert])')
      .getByRole('img', { name: 'Image 2', exact: true }),
    page
  );
  await dialog.getByRole('button', { name: 'Previous image', exact: true }).click();
  await expect(fit).toBeDisabled();
  await expectInsideViewport(image, page);
});

test.describe('native touch gestures', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 568 } });

  test('pinches, double-taps and swipes without mixing zoom with image navigation', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Native multi-touch injection uses the Chromium protocol.'
    );
    await addPhotoCollection(page);
    await page
      .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
      .tap();
    const dialog = page.getByRole('dialog', { name: /image viewer/i });
    const currentSlide = dialog
      .getByRole('region', { name: 'Photo gallery' })
      .locator('[role="group"]:not([inert])');
    const image = currentSlide.getByRole('img', { name: 'Image 1', exact: true });
    const fit = dialog.getByRole('button', { name: 'Fit image', exact: true });
    await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
    const fittedHeight = (await image.boundingBox())!.height;
    const session = await context.newCDPSession(page);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { x: number; y: number; id: number }[]
    ) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    try {
      await touch('touchStart', [
        { x: 170, y: 240, id: 1 },
        { x: 200, y: 300, id: 2 },
      ]);
      for (let step = 1; step <= 8; step++) {
        await touch('touchMove', [
          { x: 170 - step * 3, y: 240 - step * 5, id: 1 },
          { x: 200 + step * 3, y: 300 + step * 5, id: 2 },
        ]);
      }
      await touch('touchEnd', []);
      await expect(fit).toBeEnabled();
      await expect
        .poll(async () => (await image.boundingBox())!.height)
        .toBeGreaterThan(fittedHeight * 1.5);
      await fit.tap();
      await expect(fit).toBeDisabled();
      // Start each gesture example in a fresh session so an earlier pinch cannot
      // become the first tap in the library's double-tap recognition window.
      await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
      await expect(dialog).not.toBeVisible();
      await page
        .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
        .tap();
      await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
      await page.touchscreen.tap(187, 270);
      await page.touchscreen.tap(187, 270);
      await expect(fit).toBeEnabled();
      await fit.tap();
      await expect(fit).toBeDisabled();
      await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
      await expect(dialog).not.toBeVisible();
      await page
        .getByRole('button', { name: 'View images for Gallery proportions', exact: true })
        .tap();
      await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
      await touch('touchStart', [{ x: 280, y: 270, id: 1 }]);
      for (let step = 1; step <= 10; step++) {
        await touch('touchMove', [{ x: 280 - step * 20, y: 270, id: 1 }]);
      }
      await touch('touchEnd', []);
      await expect(currentSlide.getByRole('img', { name: 'Image 2', exact: true })).toBeVisible();
      await expect(fit).toBeDisabled();
    } finally {
      await session.detach();
    }
  });
});
