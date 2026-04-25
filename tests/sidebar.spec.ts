import { test, expect } from '@playwright/test';

test.describe('Sidebar Instagram categories', () => {
  test('shows all Instagram category links in sidebar', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('aside');

    // Instagram category labels should be visible in sidebar nav
    await expect(sidebar.getByText('총학생회 인스타')).toBeVisible();
    await expect(sidebar.getByText('IT대학 학생회')).toBeVisible();
    await expect(sidebar.getByText('컴퓨터학부 학생회')).toBeVisible();
  });

  test('navigates to ig-focussu category when clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('총학생회 인스타').click();
    await expect(page).toHaveURL(/category=ig-focussu/);
  });

  test('navigates to ig-it category when clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('IT대학 학생회').click();
    await expect(page).toHaveURL(/category=ig-it/);
  });

  test('navigates to ig-cse-council category when clicked', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('컴퓨터학부 학생회').click();
    await expect(page).toHaveURL(/category=ig-cse-council/);
  });
});
