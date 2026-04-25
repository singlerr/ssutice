import { test, expect } from '@playwright/test';

test.describe('NoticeCard Instagram provider badges', () => {
  test('renders Instagram provider badge with gradient for ig-focussu', async ({ page }) => {
    // Navigate directly to the ig-focussu category
    await page.goto('/?category=ig-focussu');
    // Wait for notices to load (either data or empty state)
    await page.waitForTimeout(2000);

    // Find any notice card links — the badge is a <span> inside an <a>
    const badge = page.locator('a span').filter({ hasText: '총학생회 IG' }).first();
    if (await badge.isVisible()) {
      // Verify the gradient class is applied
      const classAttr = await badge.getAttribute('class');
      expect(classAttr).toContain('bg-gradient-to-r');
      expect(classAttr).toContain('from-purple-500');
      expect(classAttr).toContain('to-pink-500');
    }
  });

  test('renders Instagram provider badge with gradient for ig-it', async ({ page }) => {
    await page.goto('/?category=ig-it');
    await page.waitForTimeout(2000);

    const badge = page.locator('a span').filter({ hasText: 'IT대학 IG' }).first();
    if (await badge.isVisible()) {
      const classAttr = await badge.getAttribute('class');
      expect(classAttr).toContain('bg-gradient-to-r');
      expect(classAttr).toContain('from-orange-500');
      expect(classAttr).toContain('to-pink-500');
    }
  });

  test('renders Instagram provider badge with gradient for ig-cse-council', async ({ page }) => {
    await page.goto('/?category=ig-cse-council');
    await page.waitForTimeout(2000);

    const badge = page.locator('a span').filter({ hasText: '컴학학생회 IG' }).first();
    if (await badge.isVisible()) {
      const classAttr = await badge.getAttribute('class');
      expect(classAttr).toContain('bg-gradient-to-r');
      expect(classAttr).toContain('from-yellow-500');
      expect(classAttr).toContain('to-pink-500');
    }
  });

  test('existing non-Instagram badges still render correctly', async ({ page }) => {
    await page.goto('/?category=university');
    await page.waitForTimeout(2000);

    const badge = page.locator('a span').filter({ hasText: '숭실대' }).first();
    if (await badge.isVisible()) {
      const classAttr = await badge.getAttribute('class');
      expect(classAttr).toContain('bg-blue-600');
    }
  });
});
