import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  getBlockSuiteEditorTitle,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test('NexusAI: Detect task and show in sidebar', async ({ page }) => {
  page.on('console', msg => {
    // helpful for diagnosing idle/trigger pipeline during CI
    console.log(`[browser console] ${msg.type()}: ${msg.text()}`);
  });
  await page.evaluate(() => console.log('test-log-from-playwright'));

  // 1. Open App
  await openHomePage(page);
  await waitForEditorLoad(page);

  // 2. Create New Page
  await clickNewPageButton(page);

  // 3. Enter Title and Move to Body
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await title.fill('Nexus AI Plan');
  await page.keyboard.press('Enter');

  // 4. Type Task Trigger
  // "I need to deploy the production build tomorrow." is a strong commitment.
  const taskText = 'I need to deploy the production build tomorrow.';
  await page.keyboard.type(taskText, { delay: 50 });

  // 5. Wait for Idle Trigger (3s) + Processing Time
  // The plan says "Idle Listener... triggers after 3 seconds of no typing".
  // Waiting for the console log from Lifecycle is more reliable than hard timeout
  try {
    const consolePromise = page.waitForEvent('console', {
      predicate: msg =>
        msg.text().includes('[NexusLifecycle] Commitments found'),
      timeout: 10000,
    });
    await consolePromise;
  } catch (e) {
    console.log('Wait for console log timed out, continuing to assertion...');
  }

  // 6. Verify Task Sidebar
  // The sidebar item should appear.
  // NOTE: The regex extractor extracts "deploy the production build tomorrow" from "I need to deploy..."
  const expectedTask = 'deploy the production build tomorrow';
  const taskItem = page.getByTestId('nexus-task-item');
  await expect(taskItem).toBeVisible({ timeout: 15000 });
  await expect(taskItem).toContainText(expectedTask);
});
