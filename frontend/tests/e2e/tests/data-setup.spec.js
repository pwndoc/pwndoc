import { test, expect } from './base.js';
import path from 'path';

test.describe('Collaborators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/data/collaborators');
  });

  test('should display collaborators page heading and table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: /add collaborator/i })).toBeVisible();
  });

  test('should create a collaborator with all fields', async ({ page }) => {
    await page.getByRole('button', { name: /add collaborator/i }).click();
    await expect(page.getByRole('dialog').getByText(/add collaborator/i)).toBeVisible();

    await page.getByTestId('create-collaborator-username-input').fill('jsmith');
    await page.getByTestId('create-collaborator-firstname-input').fill('John');
    await page.getByTestId('create-collaborator-lastname-input').fill('Smith');
    await page.getByTestId('create-collaborator-email-input').fill('john.smith@example.com');
    await page.getByTestId('create-collaborator-phone-input').fill('555-9876');
    await page.getByTestId('create-collaborator-jobtitle-input').fill('Pentester');

    await page.getByTestId('create-collaborator-role-select').click();
    await page.getByRole('option', { name: /user/i }).first().click();

    await page.getByTestId('create-collaborator-password-input').fill('StrongP@ssw0rd123');

    await page.getByTestId('create-collaborator-submit-button').click();

    await expect(page.getByText(/collaborator created successfully/i)).toBeVisible();
    await expect(page.getByText('jsmith')).toBeVisible();
  });

  test('should create a collaborator with only required fields', async ({ page }) => {
    await page.getByRole('button', { name: /add collaborator/i }).click();

    await page.getByTestId('create-collaborator-username-input').fill('mjones');
    await page.getByTestId('create-collaborator-firstname-input').fill('Mary');
    await page.getByTestId('create-collaborator-lastname-input').fill('Jones');

    await page.getByTestId('create-collaborator-role-select').click();
    await page.getByRole('option', { name: /user/i }).first().click();

    await page.getByTestId('create-collaborator-password-input').fill('AnotherP@ss123');

    await page.getByTestId('create-collaborator-submit-button').click();

    await expect(page.getByText(/collaborator created successfully/i)).toBeVisible();
    await expect(page.getByText('mjones')).toBeVisible();
  });

  test('should show validation error when required fields missing', async ({ page }) => {
    await page.getByRole('button', { name: /add collaborator/i }).click();

    await page.getByTestId('create-collaborator-submit-button').click();

    await expect(page.getByText(/username.*required/i).first()).toBeVisible();
  });

  test('should edit a collaborator', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'jsmith' });
    await row.getByTestId('edit-collaborator-button').click();

    await expect(page.getByText(/edit collaborator/i)).toBeVisible();

    const jobTitleInput = page.getByTestId('edit-collaborator-jobtitle-input');
    await jobTitleInput.clear();
    await jobTitleInput.fill('Senior Pentester');

    await page.getByTestId('edit-collaborator-submit-button').click();

    await expect(page.getByText(/collaborator updated successfully/i)).toBeVisible();
  });

  test('should disable a collaborator account', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'mjones' });
    await row.getByTestId('edit-collaborator-button').click();

    await expect(page.getByText(/edit collaborator/i)).toBeVisible();

    await page.getByTestId('edit-collaborator-enabled-toggle').click();

    await page.getByTestId('edit-collaborator-submit-button').click();

    await expect(page.getByText(/collaborator updated successfully/i)).toBeVisible();
  });
});

test.describe('Companies', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/data/companies');
    });

    test('should display companies page heading and table', async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('button', { name: /add company/i })).toBeVisible();
    });

    test('should create a company with all fields', async ({ page }) => {
      await page.getByRole('button', { name: /add company/i }).click();
      await expect(page.getByRole('dialog').getByText(/add company/i)).toBeVisible();

      await page.getByTestId('create-company-name-input').fill('Acme Corporation');
      await page.getByTestId('create-company-shortname-input').fill('ACME');

      await page.getByTestId('create-company-submit-button').click();

      await expect(page.getByText(/company created successfully/i)).toBeVisible();
      await expect(page.getByText('Acme Corporation')).toBeVisible();
    });

    test('should create a company with only required fields', async ({ page }) => {
      await page.getByRole('button', { name: /add company/i }).click();

      await page.getByTestId('create-company-name-input').fill('Test Inc');

      await page.getByTestId('create-company-submit-button').click();

      await expect(page.getByText(/company created successfully/i)).toBeVisible();
      await expect(page.getByText('Test Inc')).toBeVisible();
    });

    test('should show validation error when name is missing', async ({ page }) => {
      await page.getByRole('button', { name: /add company/i }).click();

      await page.getByTestId('create-company-submit-button').click();

      await expect(page.getByText(/name.*required/i)).toBeVisible();
    });

    test('should edit a company', async ({ page }) => {
      const row = page.getByRole('row').filter({ hasText: 'Acme Corporation' });
      await row.getByTestId('edit-company-button').click();

      await expect(page.getByText(/edit company/i)).toBeVisible();

      const shortNameInput = page.getByTestId('edit-company-shortname-input');
      await shortNameInput.clear();
      await shortNameInput.fill('ACME-UPDATED');

      await page.getByTestId('edit-company-submit-button').click();

      await expect(page.getByText(/company updated successfully/i)).toBeVisible();
      await expect(page.getByText('ACME-UPDATED')).toBeVisible();
    });

    test('should delete a company', async ({ page }) => {
      await page.getByRole('button', { name: /add company/i }).click();
      await page.getByTestId('create-company-name-input').fill('DeleteMe Corp');
      await page.getByTestId('create-company-shortname-input').fill('DMC');
      await page.getByTestId('create-company-submit-button').click();
      await expect(page.getByText(/company created successfully/i)).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'DeleteMe Corp' });
      await row.getByTestId('delete-company-button').click();

      await page.getByRole('button', { name: /delete|confirm|ok/i }).click();

      await expect(page.getByText(/company deleted successfully/i)).toBeVisible();
    });
});

test.describe('Clients', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/data/clients');
    });

    test('should display clients page heading and table', async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('button', { name: /add client/i })).toBeVisible();
    });

    test('should create a client with all fields and company', async ({ page }) => {
      await page.getByRole('button', { name: /add client/i }).click();
      await expect(page.getByRole('dialog').getByText(/add client/i)).toBeVisible();

      await page.getByTestId('create-client-company-select').click();
      await page.getByRole('option', { name: 'Acme Corporation' }).click();

      await page.getByTestId('create-client-firstname-input').fill('John');
      await page.getByTestId('create-client-lastname-input').fill('Doe');
      await page.getByTestId('create-client-email-input').fill('john.doe@acme.com');
      await page.getByTestId('create-client-title-input').fill('Security Manager');
      await page.getByTestId('create-client-phone-input').fill('555-1234');
      await page.getByTestId('create-client-cell-input').fill('555-5678');

      await page.getByTestId('create-client-submit-button').click();

      await expect(page.getByText(/client created successfully/i)).toBeVisible();
      await expect(page.getByText('john.doe@acme.com')).toBeVisible();
    });

    test('should create a client with only required fields', async ({ page }) => {
      await page.getByRole('button', { name: /add client/i }).click();

      await page.getByTestId('create-client-firstname-input').fill('Jane');
      await page.getByTestId('create-client-lastname-input').fill('Smith');
      await page.getByTestId('create-client-email-input').fill('jane.smith@test.com');

      await page.getByTestId('create-client-submit-button').click();

      await expect(page.getByText(/client created successfully/i)).toBeVisible();
      await expect(page.getByText('jane.smith@test.com')).toBeVisible();
    });

    test('should show validation error when required fields missing', async ({ page }) => {
      await page.getByRole('button', { name: /add client/i }).click();

      await page.getByTestId('create-client-submit-button').click();

      await expect(page.getByText(/firstname.*required/i).first()).toBeVisible();
      await expect(page.getByText(/lastname.*required/i).first()).toBeVisible();
      await expect(page.getByText(/email.*required/i).first()).toBeVisible();
    });

    test('should edit a client', async ({ page }) => {
      const row = page.getByRole('row').filter({ hasText: 'john.doe@acme.com' });
      await row.getByTestId('edit-client-button').click();

      await expect(page.getByText(/edit client/i)).toBeVisible();

      const titleInput = page.getByTestId('edit-client-title-input');
      await titleInput.clear();
      await titleInput.fill('Chief Security Officer');

      await page.getByTestId('edit-client-submit-button').click();

      await expect(page.getByText(/client updated successfully/i)).toBeVisible();
    });

    test('should delete a client', async ({ page }) => {
      await page.getByRole('button', { name: /add client/i }).click();
      await page.getByTestId('create-client-firstname-input').fill('Temp');
      await page.getByTestId('create-client-lastname-input').fill('User');
      await page.getByTestId('create-client-email-input').fill('temp@delete.com');
      await page.getByTestId('create-client-submit-button').click();
      await expect(page.getByText(/client created successfully/i)).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'temp@delete.com' });
      await row.getByTestId('delete-client-button').click();
      await page.getByRole('button', { name: /delete|confirm|ok/i }).click();

      await expect(page.getByText(/client deleted successfully/i)).toBeVisible();
    });
});

test.describe('Templates', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/data/templates');
    });

    test('should display templates page heading and table', async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('button', { name: /create template/i })).toBeVisible();
    });

    test('should create a template with file upload', async ({ page }) => {
      await page.getByRole('button', { name: /create template/i }).click();
      await expect(page.getByRole('dialog').getByText(/create template/i)).toBeVisible();

      await page.getByTestId('create-template-name-input').fill('E2E Full Template');

      const templatePath = path.resolve(__dirname, '/app/report-templates/Default Template.docx');
      const fileInput = page.getByTestId('create-template-file-uploader').locator('input[type="file"]');
      await fileInput.setInputFiles(templatePath);

      await page.getByTestId('create-template-submit-button').click();

      await expect(page.getByText(/template created successfully/i)).toBeVisible();
      await expect(page.getByText('E2E Full Template')).toBeVisible();
    });

    test('should create a second template', async ({ page }) => {
      await page.getByRole('button', { name: /create template/i }).click();

      await page.getByTestId('create-template-name-input').fill('E2E Minimal Template');

      const templatePath = path.resolve(__dirname, '/app/report-templates/Default Template.docx');
      const fileInput = page.getByTestId('create-template-file-uploader').locator('input[type="file"]');
      await fileInput.setInputFiles(templatePath);

      await page.getByTestId('create-template-submit-button').click();

      await expect(page.getByText(/template created successfully/i)).toBeVisible();
      await expect(page.getByText('E2E Minimal Template')).toBeVisible();
    });

    test('should show validation error when name is missing', async ({ page }) => {
      await page.getByRole('button', { name: /create template/i }).click();

      await page.getByTestId('create-template-submit-button').click();

      await expect(page.getByText(/name.*required/i)).toBeVisible();
    });

    test('should edit template name', async ({ page }) => {
      const row = page.getByRole('row').filter({ hasText: 'E2E Full Template' });
      await row.getByTestId('edit-template-button').click();

      await expect(page.getByText(/edit template/i)).toBeVisible();

      const nameInput = page.getByTestId('edit-template-name-input');
      await nameInput.clear();
      await nameInput.fill('E2E Full Template Updated');

      await page.getByTestId('edit-template-submit-button').click();

      await expect(page.getByText(/template updated successfully/i)).toBeVisible();
      await expect(page.getByText('E2E Full Template Updated')).toBeVisible();
    });

    test('should download a template', async ({ page }) => {
      const row = page.getByRole('row').filter({ hasText: 'E2E Full Template' });

      const downloadPromise = page.waitForEvent('download');
      await row.getByTestId('download-template-button').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.docx$/);
    });

    test('should delete a template', async ({ page }) => {
      await page.getByRole('button', { name: /create template/i }).click();
      await page.getByTestId('create-template-name-input').fill('DeleteMe Template');

      const templatePath = path.resolve(__dirname, '/app/report-templates/Default Template.docx');
      const fileInput = page.getByTestId('create-template-file-uploader').locator('input[type="file"]');
      await fileInput.setInputFiles(templatePath);

      await page.getByTestId('create-template-submit-button').click();
      await expect(page.getByText(/template created successfully/i)).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'DeleteMe Template' });
      await row.getByTestId('delete-template-button').click();
      await page.getByRole('button', { name: /delete|confirm|ok/i }).click();

      await expect(page.getByText(/template deleted successfully/i)).toBeVisible();
    });
});

test.describe('Spellcheck Dictionary', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/data/spellcheck');
    });

    test('should display spellcheck dictionary page', async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('should create a spellcheck dictionary word', async ({ page }) => {
      await page.getByRole('button', { name: /create word/i }).click();
      await expect(page.getByRole('dialog').getByText(/create word/i)).toBeVisible();

      await page.getByTestId('create-spellcheck-word-input').fill('pwndoc');
      await page.getByTestId('create-spellcheck-submit-button').click();

      await expect(page.getByText(/created successfully/i)).toBeVisible();
      await expect(page.getByText('pwndoc')).toBeVisible();
    });

    test('should create another spellcheck word', async ({ page }) => {
      await page.getByRole('button', { name: /create word/i }).click();

      await page.getByTestId('create-spellcheck-word-input').fill('vulnerabilities');
      await page.getByTestId('create-spellcheck-submit-button').click();

      await expect(page.getByText(/created successfully/i)).toBeVisible();
      await expect(page.getByRole('table').getByText('vulnerabilities')).toBeVisible();
    });

    test('should show validation error when word is empty', async ({ page }) => {
      await page.getByRole('button', { name: /create word/i }).click();

      await page.getByTestId('create-spellcheck-submit-button').click();

      await expect(page.getByText(/word.*required/i)).toBeVisible();
    });

    test('should delete a spellcheck word', async ({ page }) => {
      await page.getByRole('button', { name: /create word/i }).click();
      await page.getByTestId('create-spellcheck-word-input').fill('deleteme');
      await page.getByTestId('create-spellcheck-submit-button').click();
      await expect(page.getByText(/created successfully/i)).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'deleteme' });
      await row.getByTestId('delete-spellcheck-button').click();
      await page.getByRole('button', { name: /delete|confirm|ok/i }).click();

      await expect(page.getByText(/deleted successfully/i)).toBeVisible();
    });
});

test.describe('LanguageTool Rules', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/data/languagetool-rules');
    });

    test('should display languagetool rules page', async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('should create a languagetool rule with valid XML', async ({ page }) => {
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page.getByRole('dialog').getByText(/create rule/i)).toBeVisible();

      await page.getByTestId('create-rule-language-select').click();
      await page.getByRole('option', { name: 'EN' }).click();

      const ruleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
  <rule id="E2E_TEST_RULE_1" name="E2E Test Rule 1">
    <pattern>
      <token>testword</token>
    </pattern>
    <message>This is a test rule</message>
  </rule>
</rules>`;

      await page.getByTestId('create-rule-xml-input').fill(ruleXml);
      await page.getByTestId('create-rule-submit-button').click();

      await expect(page.getByText(/created successfully/i)).toBeVisible();
      await expect(page.getByText('E2E_TEST_RULE_1')).toBeVisible();
      await expect(page.getByText('E2E Test Rule 1')).toBeVisible();
    });

    test('should create a rule for another language', async ({ page }) => {
      await page.getByRole('button', { name: /create/i }).click();

      await page.getByTestId('create-rule-language-select').click();
      await page.getByRole('option', { name: 'FR' }).click();

      const ruleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="fr">
  <rule id="E2E_TEST_RULE_2" name="E2E Test Rule 2">
    <pattern>
      <token>mottest</token>
    </pattern>
    <message>Ceci est une règle de test</message>
  </rule>
</rules>`;

      await page.getByTestId('create-rule-xml-input').fill(ruleXml);
      await page.getByTestId('create-rule-submit-button').click();

      await expect(page.getByText(/created successfully/i)).toBeVisible();
      await expect(page.getByText('E2E_TEST_RULE_2')).toBeVisible();
    });

    test('should show validation error when fields are missing', async ({ page }) => {
      await page.getByRole('button', { name: /create/i }).click();

      await page.getByTestId('create-rule-submit-button').click();

      await expect(page.getByText(/language.*required/i)).toBeVisible();
    });

    test('should show error for invalid XML', async ({ page }) => {
      await page.getByRole('button', { name: /create/i }).click();

      await page.getByTestId('create-rule-language-select').click();
      await page.getByRole('option', { name: 'EN' }).click();

      await page.getByTestId('create-rule-xml-input').fill('<invalid>xml');
      await page.getByTestId('create-rule-submit-button').click();

      await expect(page.getByText(/error.*xml|invalid.*xml|parsing/i)).toBeVisible();
    });

    test('should view a rule in read-only modal', async ({ page }) => {
      const row = page.getByRole('row').filter({ hasText: 'E2E_TEST_RULE_1' });
      await row.getByTestId('view-rule-button').click();

      await expect(page.getByText(/view rule.*E2E Test Rule 1/i)).toBeVisible();

      await page.getByTestId('view-rule-close-button').click();
    });

    test('should delete a languagetool rule', async ({ page }) => {
      await page.getByRole('button', { name: /create/i }).click();
      await page.getByTestId('create-rule-language-select').click();
      await page.getByRole('option', { name: 'EN' }).click();

      const ruleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
  <rule id="E2E_TEMP_RULE" name="E2E Temp Rule">
    <pattern>
      <token>temp</token>
    </pattern>
    <message>Temporary rule</message>
  </rule>
</rules>`;

      await page.getByTestId('create-rule-xml-input').fill(ruleXml);
      await page.getByTestId('create-rule-submit-button').click();
      await expect(page.getByText(/created successfully/i)).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: 'E2E_TEMP_RULE' });
      await row.getByTestId('delete-rule-button').click();
      await page.getByRole('button', { name: /delete|confirm|ok/i }).click();
      await expect(page.getByText(/rule deleted successfully|deleted successfully/i)).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: 'E2E_TEMP_RULE' })).toHaveCount(0);
    });
});

test.describe('Custom Data Setup Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/data/custom');
  });

  test.describe('Page Layout', () => {
    test('should display navigation and tab elements', async ({ page }) => {
      // Verify top nav items scoped to the top toolbar to avoid sidebar collisions.
      const toolbarNavItems = page.getByRole('toolbar').getByRole('listitem');
      await expect(toolbarNavItems.filter({ hasText: 'Audits' })).toBeVisible();
      await expect(toolbarNavItems.filter({ hasText: 'Vulnerabilities' })).toBeVisible();
      await expect(toolbarNavItems.filter({ hasText: 'Data' })).toBeVisible();
      await expect(toolbarNavItems.filter({ hasText: 'Settings' })).toBeVisible();

      // Verify tabs are visible
      await expect(page.getByRole('tab', { name: 'Languages' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Audit Types' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Vulnerability Types' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Vulnerability Categories' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Custom Fields' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Custom Sections' })).toBeVisible();
    });

    test('should show languages tab by default', async ({ page }) => {
      // The languages tab should be active by default
      await expect(page.getByRole('tab', { name: 'Languages' })).toHaveAttribute('aria-selected', 'true');
      // Check the description text is visible
      await expect(page.getByText('Languages used in Audits and Vulnerabilities')).toBeVisible();
    });

    test('should display left sidebar with data navigation links', async ({ page }) => {
      await expect(page.getByRole('listitem').filter({ hasText: 'Collaborators' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Companies' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Clients' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Templates' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Custom Data' })).toBeVisible();
    });
  });

  test.describe('Languages', () => {
    test('should create a new language', async ({ page }) => {
      // Fill in the language form
      const languageInput = page.getByTestId('create-language-name-input');
      const localeInput = page.getByTestId('create-language-locale-input');

      await languageInput.fill('English');
      await localeInput.fill('en');

      // Click the add button
      await page.getByTestId('create-language-submit-button').click();

      // Wait for success notification
      await expect(page.getByText('Language created successfully')).toBeVisible();

      // Verify the language appears in the list
      await expect(page.getByText('List of Languages')).toBeVisible();
    });

    test('should create a second language', async ({ page }) => {
      const languageInput = page.getByTestId('create-language-name-input');
      const localeInput = page.getByTestId('create-language-locale-input');

      await languageInput.fill('French');
      await localeInput.fill('fr');

      await page.getByTestId('create-language-submit-button').click();

      await expect(page.getByText('Language created successfully')).toBeVisible();
    });

    test('should not create a duplicate language', async ({ page }) => {
      const languageInput = page.getByTestId('create-language-name-input');
      const localeInput = page.getByTestId('create-language-locale-input');

      await languageInput.fill('English');
      await localeInput.fill('en');

      await page.getByTestId('create-language-submit-button').click();

      // Should show an error notification
      await expect(page.getByText(/already exists|Language already/)).toBeVisible({ timeout: 5000 });
    });

    test('should not create a language without required fields', async ({ page }) => {
      // Try to create without filling anything - click the + button
      await page.getByTestId('create-language-submit-button').click();

      // Validation errors should appear
      await expect(page.getByText('Language is required')).toBeVisible();
      await expect(page.getByText('Locale is required')).toBeVisible();
    });

    test('should edit an existing language', async ({ page }) => {
      // Wait for the list to load
      await expect(page.getByText('List of Languages')).toBeVisible();

      // Click the edit button from the languages list toolbar
      await page.getByText('List of Languages').locator('..').getByRole('button').click();

      // Should show edit mode
      await expect(page.getByText('Edit Languages')).toBeVisible();

      // Verify Cancel and Save buttons are visible
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

      // Click Cancel to exit edit mode
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Should go back to list view
      await expect(page.getByText('List of Languages')).toBeVisible();
    });

    test('should delete a language via edit mode', async ({ page }) => {
      // First create a temporary language to delete
      const languageInput = page.getByTestId('create-language-name-input');
      const localeInput = page.getByTestId('create-language-locale-input');

      await languageInput.fill('TempLang');
      await localeInput.fill('tmp');
      await page.getByTestId('create-language-submit-button').click();
      await expect(page.getByText('Language created successfully')).toBeVisible();

      // Now enter edit mode
      await page.getByText('List of Languages').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Languages')).toBeVisible();

      // Find and click the remove button (x) for the TempLang entry
      await page.getByTestId('delete-language-tmp').click();

      // Save changes
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Languages updated successfully')).toBeVisible();
    });
  });

  test.describe('Vulnerability Types', () => {
    test('should navigate to vulnerability types tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();
      await expect(page.getByText('Create Vulnerability Types')).toBeVisible();
      await expect(page.getByText('List of Vulnerability Types')).toBeHidden();
    });

    test('should create a vulnerability type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // The language dropdown should already have a language selected
      // Fill in the name
      const nameInput = page.getByTestId('create-vuln-type-name-input');
      await nameInput.fill('Web Application');
      await page.getByTestId('create-vuln-type-submit-button').click();

      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('List of Vulnerability Types')).toBeVisible();
    });

    test('should create a second vulnerability type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      const nameInput = page.getByTestId('create-vuln-type-name-input');
      await nameInput.fill('Network');
      await page.getByTestId('create-vuln-type-submit-button').click();

      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();
    });

    test('should not create a vulnerability type without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // Click add without filling the name
      await page.getByTestId('create-vuln-type-submit-button').click();

      // Validation error should appear
      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should edit vulnerability types', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      await expect(page.getByText('List of Vulnerability Types')).toBeVisible();

      // Click edit button
      await page.getByText('List of Vulnerability Types').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Vulnerability Types')).toBeVisible();

      // Cancel edit
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('List of Vulnerability Types')).toBeVisible();
    });

    test('should delete a vulnerability type via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // Create a temporary vuln type
      const nameInput = page.getByTestId('create-vuln-type-name-input');
      await nameInput.fill('TempVulnType');
      await page.getByTestId('create-vuln-type-submit-button').click();
      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();

      // Enter edit mode
      await page.getByText('List of Vulnerability Types').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Vulnerability Types')).toBeVisible();

      // Remove the temp entry
      await page.getByTestId('delete-vuln-type-TempVulnType').click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Vulnerability Types updated successfully')).toBeVisible();
    });
  });

  test.describe('Vulnerability Categories', () => {
    test('should navigate to vulnerability categories tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();
      await expect(page.getByText('Create Vulnerability Categories')).toBeVisible();
    });

    test('should create a vulnerability category', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Fill in name
      const nameInput = page.getByTestId('create-vuln-category-name-input');
      await nameInput.fill('Critical Findings');

      // Click Create button
      await page.getByTestId('create-vuln-category-submit-button').click();

      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('List of Categories')).toBeVisible();
    });

    test('should create a second vulnerability category', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      const nameInput = page.getByTestId('create-vuln-category-name-input');
      await nameInput.fill('Minor Findings');

      await page.getByTestId('create-vuln-category-submit-button').click();
      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();
    });

    test('should not create a vulnerability category without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Click Create without filling name
      await page.getByTestId('create-vuln-category-submit-button').click();

      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should show default sorting options when creating', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Verify sorting fields are visible
      await expect(page.getByTestId('create-vuln-category-sort-by')).toBeVisible();
      await expect(page.getByTestId('create-vuln-category-sort-order')).toBeVisible();
      await expect(page.getByTestId('create-vuln-category-auto-sorting')).toBeVisible();
    });

    test('should edit vulnerability categories', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      await expect(page.getByText('List of Categories')).toBeVisible();

      // Click edit button
      await page.getByText('List of Categories').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Categories')).toBeVisible();

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('List of Categories')).toBeVisible();
    });

    test('should delete a vulnerability category via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Create a temp category
      const nameInput = page.getByTestId('create-vuln-category-name-input');
      await nameInput.fill('TempCategory');
      await page.getByTestId('create-vuln-category-submit-button').click();
      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();

      // Enter edit mode
      await page.getByText('List of Categories').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Categories')).toBeVisible();

      // Remove the temp entry
      await page.getByTestId('delete-vuln-category-TempCategory').click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Vulnerability Categories updated successfully')).toBeVisible();
    });
  });

  test.describe('Custom Sections', () => {
    test('should navigate to custom sections tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();
      await expect(page.getByText('Create Custom Sections')).toBeVisible();
    });

    test('should create a custom section', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Fill in name, field, and icon
      const nameInput = page.getByTestId('create-section-name-input');
      const fieldInput = page.getByTestId('create-section-field-input');

      await nameInput.fill('Executive Summary');
      await fieldInput.fill('executive_summary');

      // Click the + button to create
      await page.getByTestId('create-section-submit-button').click();

      await expect(page.getByText('Section created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('List of Sections')).toBeVisible();
    });

    test('should create a second custom section', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      const nameInput = page.getByTestId('create-section-name-input');
      const fieldInput = page.getByTestId('create-section-field-input');

      await nameInput.fill('Methodology');
      await fieldInput.fill('methodology');

      await page.getByTestId('create-section-submit-button').click();
      await expect(page.getByText('Section created successfully')).toBeVisible();
    });

    test('should not create a section without required fields', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Click add without filling fields
      await page.getByTestId('create-section-submit-button').click();

      await expect(page.getByText('Field required')).toBeVisible();
      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should edit custom sections', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      await expect(page.getByText('List of Sections')).toBeVisible();

      // Click edit button
      await page.getByText('List of Sections').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Sections')).toBeVisible();

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('List of Sections')).toBeVisible();
    });

    test('should delete a section via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Create a temp section
      const nameInput = page.getByTestId('create-section-name-input');
      const fieldInput = page.getByTestId('create-section-field-input');

      await nameInput.fill('TempSection');
      await fieldInput.fill('temp_section');
      await page.getByTestId('create-section-submit-button').click();
      await expect(page.getByText('Section created successfully')).toBeVisible();

      // Enter edit mode
      await page.getByText('List of Sections').locator('..').getByRole('button').click();
      await expect(page.getByText('Edit Sections')).toBeVisible();

      // Remove the temp entry
      await page.getByTestId('delete-section-temp_section').click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Sections updated successfully')).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between all tabs', async ({ page }) => {
      // Languages (default)
      await expect(page.getByRole('tab', { name: 'Languages' })).toHaveAttribute('aria-selected', 'true');

      // Switch to Audit Types
      await page.getByRole('tab', { name: 'Audit Types' }).click();
      await expect(page.getByRole('tab', { name: 'Audit Types' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Audit Types used in Audits')).toBeVisible();

      // Switch to Vulnerability Types
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();
      await expect(page.getByRole('tab', { name: 'Vulnerability Types' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Vulnerability Types')).toBeVisible();

      // Switch to Vulnerability Categories
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();
      await expect(page.getByRole('tab', { name: 'Vulnerability Categories' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Vulnerability Categories')).toBeVisible();

      // Switch to Custom Fields
      await page.getByRole('tab', { name: 'Custom Fields' }).click();
      await expect(page.getByRole('tab', { name: 'Custom Fields' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create and manage Custom Fields')).toBeVisible();

      // Switch to Custom Sections
      await page.getByRole('tab', { name: 'Custom Sections' }).click();
      await expect(page.getByRole('tab', { name: 'Custom Sections' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Custom Sections')).toBeVisible();
    });
  });

  test.describe('Audit Types (requires languages and templates)', () => {
    test('should display audit type creation form when languages exist', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // When languages exist, the audit type form should be visible
      await expect(page.getByText('Audit Phase')).toBeVisible();
      await expect(page.getByLabel('Default')).toBeVisible();
      await expect(page.getByLabel('Retest')).toBeVisible();
      await expect(page.getByLabel('Multi')).toBeVisible();

      // Name field should be visible
      await expect(page.getByLabel(/Name/)).toBeVisible();

      // Create button should be present
      await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    });

    test('should not create an audit type without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // Click Create without filling name
      await page.getByRole('button', { name: 'Create' }).click();

      // Validation error should appear
      await expect(page.getByText('Name is required')).toBeVisible();
    });

    test('should create an audit type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // Fill in the name
      const nameInput = page.getByLabel(/Name/);
      await nameInput.fill('E2E Pentest');

      // Select template for English language
      const templateEnglishSelect = page.getByLabel(/English Template/).first();
      await templateEnglishSelect.click();
      await page.getByRole('option', { name: 'E2E Full Template Updated' }).click();

      // Wait for the first dropdown to close before opening the second
      await expect(page.getByRole('listbox')).toBeHidden();

      // Select template for French language
      const templateFrenchSelect = page.getByLabel(/French Template/).first();
      await templateFrenchSelect.click();
      await expect(page.getByRole('option', { name: 'E2E Full Template Updated' })).toBeVisible();
      await page.getByRole('option', { name: 'E2E Full Template Updated' }).click();

      // Wait for dropdown to close before clicking Create
      await expect(page.getByRole('listbox')).toBeHidden();

      // Attach at least one custom section to the audit type so audits inherit sections
      const sectionsSelect = page.getByLabel(/Add Sections/i);
      await sectionsSelect.click();
      await page.getByRole('option', { name: 'Executive Summary' }).click();
      await expect(sectionsSelect).toHaveValue('Executive Summary');

      // Click Create
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify success
      await expect(page.getByText('Audit type created successfully')).toBeVisible();
    });
  });
});
