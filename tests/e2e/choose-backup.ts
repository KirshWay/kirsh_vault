import type { FileChooser, Page } from '@playwright/test';

export async function selectBackup(page: Page, file: Parameters<FileChooser['setFiles']>[0]) {
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  // Register interception before clicking, so the native system dialog never opens.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Restore from file' }).click();
  await (await chooser).setFiles(file);
}
