import { test } from '@playwright/test';
import { cameraFlow } from './camera-flow';
test('TC-225 local camera is optional, mirrored and stops on all navigation paths', async ({
  page,
}, info) => cameraFlow(page, info));
test('TC-225 denied camera does not block a text session', async ({ page }, info) =>
  cameraFlow(page, info, true));
