import { test } from '@playwright/test';
import { cameraFlow } from '../e2e/camera-flow';
test('TC-225 demo camera stays local and optional', async ({ page }, info) =>
  cameraFlow(page, info));
test('TC-225 demo denied camera still allows practice', async ({ page }, info) =>
  cameraFlow(page, info, true));
