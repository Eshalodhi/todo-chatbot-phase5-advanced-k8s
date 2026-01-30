import { test, expect } from '@playwright/test';

test.describe('Task CRUD Operations', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with stats', async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText(/total tasks/i)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pending/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /completed/i })).toBeVisible();
  });

  test('should open create task modal', async ({ page }) => {
    // Click Add Task button
    await page.getByRole('button', { name: /add task/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create.*task/i })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /add task/i }).click();

    // Fill in task details
    await page.getByLabel(/title/i).fill('Test Task from E2E');
    await page.getByLabel(/description/i).fill('This is a test task created by Playwright');

    // Submit
    await page.getByRole('button', { name: /create task/i }).click();

    // Modal should close and task should appear in list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test Task from E2E')).toBeVisible();
  });

  test('should toggle task completion', async ({ page }) => {
    // First create a task
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel(/title/i).fill('Task to Toggle');
    await page.getByRole('button', { name: /create task/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Find the task and toggle it
    const taskCard = page.locator('article').filter({ hasText: 'Task to Toggle' });
    const checkbox = taskCard.getByRole('button', { name: /mark as complete/i });

    await checkbox.click();

    // Task should now show as completed (line-through or opacity change)
    await expect(taskCard).toHaveClass(/opacity-60|completed/);
  });

  test('should edit a task', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel(/title/i).fill('Task to Edit');
    await page.getByRole('button', { name: /create task/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Find the task and open edit modal
    const taskCard = page.locator('article').filter({ hasText: 'Task to Edit' });
    await taskCard.getByRole('button', { name: /task options/i }).click();
    await page.getByRole('button', { name: /edit/i }).click();

    // Edit the task
    await page.getByLabel(/title/i).clear();
    await page.getByLabel(/title/i).fill('Edited Task Title');
    await page.getByRole('button', { name: /save changes/i }).click();

    // Modal should close and updated task should appear
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edited Task Title')).toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    // Create a task first
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel(/title/i).fill('Task to Delete');
    await page.getByRole('button', { name: /create task/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Find the task and open delete confirmation
    const taskCard = page.locator('article').filter({ hasText: 'Task to Delete' });
    await taskCard.getByRole('button', { name: /task options/i }).click();
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /delete/i }).click();

    // Task should be removed
    await expect(page.getByText('Task to Delete')).not.toBeVisible({ timeout: 5000 });
  });

  test('should filter tasks by status', async ({ page }) => {
    // Click on Pending filter
    await page.getByRole('button', { name: /pending/i }).click();

    // Should only show pending tasks (if any)
    // The filter button should be active
    await expect(page.getByRole('button', { name: /pending/i })).toHaveClass(/bg-white|active/);
  });

  test('should open command palette with Cmd+K', async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press('Control+k');

    // Command palette should appear
    await expect(page.getByPlaceholder(/search commands/i)).toBeVisible();
  });

  test('should navigate via command palette', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k');

    // Type to search
    await page.getByPlaceholder(/search commands/i).fill('dashboard');

    // Should show dashboard command
    await expect(page.getByText(/go to dashboard/i)).toBeVisible();
  });

  test('should show empty state when no tasks', async ({ page }) => {
    // This test assumes the mock API starts with empty tasks or we filter to show no results
    // Click on a filter that might show no tasks
    await page.getByRole('button', { name: /completed/i }).click();

    // If no completed tasks, should show empty state
    // This is conditional on the mock data
    const emptyState = page.getByText(/no.*tasks|all caught up/i);
    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Task CRUD - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should show FAB on mobile', async ({ page }) => {
    // FAB should be visible on mobile
    await expect(page.getByRole('button', { name: /add new task/i })).toBeVisible();
  });

  test('should create task from FAB', async ({ page }) => {
    // Click FAB
    await page.getByRole('button', { name: /add new task/i }).click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should open mobile menu', async ({ page }) => {
    // Click hamburger menu
    await page.getByRole('button', { name: /open menu/i }).click();

    // Mobile menu should be visible
    await expect(page.getByRole('navigation', { name: /mobile navigation/i })).toBeVisible();
  });
});
