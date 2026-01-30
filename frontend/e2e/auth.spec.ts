import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
  });

  test('should display landing page with login/register buttons', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check for auth buttons
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /get started/i }).first().click();

    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('should show validation errors on empty login form submission', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email is required|invalid email/i)).toBeVisible();
  });

  test('should show validation errors on empty register form submission', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show validation errors
    await expect(page.getByText(/name is required|required/i)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in valid credentials (mock auth accepts any valid email/password)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Should show user greeting
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test('should register successfully with valid data', async ({ page }) => {
    await page.goto('/register');

    // Fill in registration form
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
    await page.getByLabel(/confirm password/i).fill('StrongPass123!');

    // Submit the form
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Click user menu and logout
    await page.getByRole('button', { name: /test/i }).click();
    await page.getByRole('button', { name: /sign out/i }).click();

    // Should redirect to home or login
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 5000 });
  });

  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByLabel(/password/i);
    const toggleButton = page.getByRole('button', { name: /show password/i });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    await toggleButton.click();

    // Password should now be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
