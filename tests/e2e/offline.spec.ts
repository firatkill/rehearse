import { expect, test } from '@playwright/test';
import { startTextSession } from './storage-helpers';
test('TC-112 E2E-22 offline review disables scoring until reconnection', async ({
  page,
  context,
}, info) => {
  await startTextSession(page, info);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I delivered the project and checked the outcome.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  try {
    await context.setOffline(true);
    await expect(
      page.getByText('You’re offline. You can keep answering; feedback needs a connection.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get feedback' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Get feedback' })).toHaveAccessibleDescription(
      'You’re offline. Feedback needs a connection.',
    );
    await page.getByLabel('Your answer').fill('I can still edit the answer while offline.');
  } finally {
    await context.setOffline(false);
  }
  await expect(page.getByRole('button', { name: 'Get feedback' })).toBeEnabled();
  await expect(page.getByLabel('Your answer')).toHaveValue(
    'I can still edit the answer while offline.',
  );
});
