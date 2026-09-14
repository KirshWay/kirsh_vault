import { expect, type Page, test } from '@playwright/test';

async function addRecord(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Add First Item', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Shared record');
  await page.getByLabel('Description', { exact: true }).fill('Original description');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

async function editDescription(page: Page, description: string) {
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Update Item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('stale edits preserve both the other tab’s changes and the unsaved draft', async ({
  page,
  context,
}) => {
  await addRecord(page);
  const other = await context.newPage();
  await other.goto('./');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('My unsaved draft');
  await editDescription(other, 'Saved in another tab');
  await page.getByRole('button', { name: 'Update Item', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('My unsaved draft');
  await expect(page.getByRole('button', { name: 'Update Item', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Saved in another tab');
  await page.getByLabel('Name', { exact: true }).fill('Reviewed edit');
  await page.getByRole('button', { name: 'Update Item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(other.getByRole('heading', { name: 'Reviewed edit', exact: true })).toBeVisible();
});

test('deletion needs a current confirmation and cancellation preserves the record', async ({
  page,
  context,
}) => {
  await addRecord(page);
  const other = await context.newPage();
  await other.goto('./');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await editDescription(other, 'Keep this recent edit');
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page.getByRole('button', { name: 'Delete item', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Item', exact: true })).toBeFocused();
  await expect(other.getByRole('button', { name: 'Add First Item', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Add First Item', exact: true })).toBeVisible();
});
