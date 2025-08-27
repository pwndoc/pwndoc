import { test as setup, expect } from '@playwright/test';
import path from 'path';


setup('authenticate', async ({ page, browserName }) => {
  // Go to login page
  await page.goto('/login');
  // await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
  // await expect(page.getByLabel('Password')).toBeVisible();
  // await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  
  // Fill in login credentials 
  // await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  // await page.getByRole('textbox', { name: 'Firstname' }).fill('Pwn');
  // await page.getByRole('textbox', { name: 'Lastname' }).fill('Doc');
  // await page.getByLabel('Password').fill('Admin123');
  // await page.getByRole('button', { name: 'Register First User' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByLabel('Password').fill('Admin123');
  
  // Click login button
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for successful login
  await expect(page).toHaveURL('/audits');

  // Store authentication state
  const stateFile = path.join(__dirname, `storageState.${browserName}.json`);
  await page.context().storageState({ path: stateFile });
});