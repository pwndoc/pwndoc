import { chromium, request as playwrightRequest } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.BASE_URL || 'https://localhost:8443';
const OUTPUT_DIR = process.env.DEMO_OUTPUT_DIR || path.resolve(process.cwd(), 'demos');
const TEMPLATE_PATH = process.env.DEMO_TEMPLATE_PATH || '/app/report-templates/Default Template.docx';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const GIF_FPS = process.env.DEMO_GIF_FPS || '10';
const GIF_WIDTH = process.env.DEMO_GIF_WIDTH || '960';
const VIEWPORT = { width: 1440, height: 900 };
const HALF_VIEWPORT = { width: 1024, height: 900 };
const ADMIN = { username: 'admin', password: 'Admin123', firstname: 'Pwn', lastname: 'Doc' };
const REVIEWER = { username: 'rchen', password: 'ReviewerP@ss123', firstname: 'Riley', lastname: 'Chen' };
const COLLABORATOR = { username: 'apatel', password: 'CollaboratorP@ss123', firstname: 'Avery', lastname: 'Patel' };

const demos = [
  ['audit_authoring.gif', recordAuditAuthoring],
  ['vulnerability_workflow.gif', recordVulnerabilityWorkflow],
  ['collaboration_review.gif', recordCollaborationReview],
  ['retest_draft_recovery.gif', recordRetestDraftRecovery],
  ['customization_operations.gif', recordCustomizationOperations],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ok(response, label) {
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`${label} failed: ${response.status()} ${body}`);
  }
  return response.json();
}

async function apiContext(storageState) {
  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    storageState,
  });
}

async function loginApi(username, password) {
  const api = await apiContext();
  await ok(await api.post('/api/users/token', { data: { username, password } }), `login ${username}`);
  const storageState = await api.storageState();
  await api.dispose();
  return storageState;
}

async function waitForAppReady() {
  const api = await apiContext();
  const deadline = Date.now() + 120000;
  let lastStatus = 'not attempted';

  while (Date.now() < deadline) {
    try {
      const response = await api.get('/api/users/init', { timeout: 5000 });
      lastStatus = String(response.status());
      if (response.ok()) {
        await api.dispose();
        return;
      }
    } catch (error) {
      lastStatus = error.message;
    }
    await sleep(2000);
  }

  await api.dispose();
  throw new Error(`PwnDoc did not become ready within 120s; last status: ${lastStatus}`);
}

async function initAdmin() {
  await waitForAppReady();
  const api = await apiContext();
  await api.post('/api/__test__/reset-db').catch(() => null);
  await ok(await api.post('/api/users/init', { data: ADMIN }), 'init admin');
  const storageState = await api.storageState();
  await api.dispose();
  return storageState;
}

async function createBrowserContext(browser, storageState, name) {
  const videoDir = path.join('/tmp', 'pwndoc-demo-videos', path.parse(name).name);
  fs.mkdirSync(videoDir, { recursive: true });
  return browser.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    storageState,
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
}

async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    window.__demoCursor = { x: 72, y: 72 };
    const style = document.createElement('style');
    style.textContent = `
      .pwndoc-demo-cursor {
        position: fixed;
        z-index: 2147483647;
        width: 18px;
        height: 18px;
        border: 2px solid #111827;
        border-radius: 999px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 1px 6px rgba(0,0,0,.25);
        pointer-events: none;
        transform: translate(-50%, -50%);
      }
    `;
    document.documentElement.appendChild(style);
    const cursor = document.createElement('div');
    cursor.className = 'pwndoc-demo-cursor';
    cursor.style.left = `${window.__demoCursor.x}px`;
    cursor.style.top = `${window.__demoCursor.y}px`;
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(cursor));
    window.__moveDemoCursor = (x, y) => {
      window.__demoCursor = { x, y };
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };
  });
  return page;
}

async function moveTo(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  const x = box.x + Math.min(box.width / 2, Math.max(12, box.width - 12));
  const y = box.y + Math.min(box.height / 2, Math.max(12, box.height - 12));
  await page.mouse.move(x, y, { steps: 12 });
  await page.evaluate(({ x, y }) => window.__moveDemoCursor?.(x, y), { x, y }).catch(() => null);
  await sleep(120);
}

async function click(page, locator) {
  await moveTo(page, locator);
  await locator.click();
  await sleep(300);
}

async function fill(page, locator, value) {
  await moveTo(page, locator);
  await locator.fill(value);
  await sleep(200);
}

async function goto(page, url, landmark) {
  await page.goto(url);
  if (landmark) await landmark(page).waitFor({ state: 'visible' });
  await sleep(800);
}

async function runFfmpeg(args) {
  await execFileAsync(FFMPEG_PATH, ['-y', ...args], { maxBuffer: 1024 * 1024 * 64 });
}

async function convertVideoToGif(inputPath, outputPath) {
  const palettePath = path.join('/tmp', `pwndoc-demo-${path.parse(outputPath).name}-palette.png`);
  const scaleFilter = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos`;

  await runFfmpeg([
    '-i', inputPath,
    '-vf', `${scaleFilter},palettegen=stats_mode=diff`,
    palettePath,
  ]);
  await runFfmpeg([
    '-i', inputPath,
    '-i', palettePath,
    '-lavfi', `${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    '-loop', '0',
    outputPath,
  ]);
  fs.rmSync(palettePath, { force: true });
}

async function saveDemoAssets(page, context, filename) {
  const video = page.video();
  await context.close();
  if (!video) throw new Error(`No video produced for ${filename}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const videoPath = path.join(OUTPUT_DIR, `${path.parse(filename).name}.webm`);
  fs.copyFileSync(await video.path(), videoPath);
  await convertVideoToGif(videoPath, path.join(OUTPUT_DIR, filename));
}

async function record(browser, storageState, filename, fn) {
  const context = await createBrowserContext(browser, storageState, filename);
  const page = await newPage(context);
  try {
    await fn(page);
    await sleep(1000);
  } finally {
    await saveDemoAssets(page, context, filename);
  }
}

async function hstackVideos(leftPath, rightPath, outPath) {
  await runFfmpeg([
    '-i', leftPath,
    '-i', rightPath,
    '-filter_complex',
    `[0:v]scale=${HALF_VIEWPORT.width}:${HALF_VIEWPORT.height},setpts=PTS-STARTPTS,fps=25[l];` +
    `[1:v]scale=${HALF_VIEWPORT.width}:${HALF_VIEWPORT.height},setpts=PTS-STARTPTS,fps=25[r];` +
    `[l][r]hstack=inputs=2,format=yuv420p[v]`,
    '-map', '[v]',
    '-shortest',
    '-c:v', 'libvpx',
    '-b:v', '2M',
    outPath,
  ]);
}

async function concatVideos(parts, outPath) {
  const listFile = `${outPath}.txt`;
  fs.writeFileSync(listFile, parts.map((part) => `file '${part}'`).join('\n'));
  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath]);
  fs.unlinkSync(listFile);
}

async function recordSideBySide(browser, leftState, rightState, name, fn) {
  const leftDir = path.join('/tmp', 'pwndoc-demo-videos', name, 'left');
  const rightDir = path.join('/tmp', 'pwndoc-demo-videos', name, 'right');
  fs.mkdirSync(leftDir, { recursive: true });
  fs.mkdirSync(rightDir, { recursive: true });

  const leftContext = await browser.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    storageState: leftState,
    viewport: HALF_VIEWPORT,
    recordVideo: { dir: leftDir, size: HALF_VIEWPORT },
  });
  const rightContext = await browser.newContext({
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    storageState: rightState,
    viewport: HALF_VIEWPORT,
    recordVideo: { dir: rightDir, size: HALF_VIEWPORT },
  });

  const leftPage = await newPage(leftContext);
  const rightPage = await newPage(rightContext);
  const leftVideo = leftPage.video();
  const rightVideo = rightPage.video();

  let leftFinalState;
  let rightFinalState;
  try {
    await fn(leftPage, rightPage);
    await sleep(1000);
  } finally {
    leftFinalState = await leftContext.storageState();
    rightFinalState = await rightContext.storageState();
    await leftContext.close();
    await rightContext.close();
  }

  return {
    leftPath: await leftVideo.path(),
    rightPath: await rightVideo.path(),
    leftState: leftFinalState,
    rightState: rightFinalState,
  };
}

async function createTemplate(api) {
  const file = fs.readFileSync(TEMPLATE_PATH).toString('base64');
  await ok(await api.post('/api/templates', {
    data: { name: 'Acme English Report', ext: 'docx', file },
  }), 'create template');
  const templates = await ok(await api.get('/api/templates'), 'get templates');
  return templates.datas.find((template) => template.name === 'Acme English Report');
}

function findingPayload(overrides = {}) {
  return {
    title: 'SQL Injection in Search Endpoint',
    vulnType: 'Web Application',
    description: '<p>User-controlled input reaches a SQL query without sufficient parameterization.</p>',
    observation: '<p>The search endpoint returns database errors when quote characters are submitted.</p>',
    remediation: '<p>Use parameterized queries and add regression tests around all search filters.</p>',
    remediationComplexity: 2,
    priority: 4,
    references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
    cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L',
    cvssv4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:L/SC:N/SI:N/SA:N',
    poc: '<p>Submitting <code>acme&apos; OR 1=1--</code> returned additional account rows.</p>',
    scope: '10.0.10.25\napp.acme.example',
    category: 'Critical Findings',
    customFields: [],
    ...overrides,
  };
}

async function seedData(adminState) {
  const api = await apiContext(adminState);
  await ok(await api.post('/api/users', { data: { ...REVIEWER, role: 'admin', jobTitle: 'Security Reviewer' } }), 'create reviewer');
  await ok(await api.post('/api/users', { data: { ...COLLABORATOR, role: 'collaborator', jobTitle: 'Pentester' } }), 'create collaborator');

  await ok(await api.post('/api/data/languages', { data: { language: 'English', locale: 'en' } }), 'create en');
  await ok(await api.post('/api/data/languages', { data: { language: 'French', locale: 'fr' } }), 'create fr');
  await ok(await api.post('/api/data/vulnerability-types', { data: { name: 'Web Application', locale: 'en' } }), 'create web type');
  await ok(await api.post('/api/data/vulnerability-categories', { data: { name: 'Critical Findings' } }), 'create category');
  await ok(await api.post('/api/data/sections', { data: { field: 'executive_summary', name: 'Executive Summary', locale: 'en', icon: 'summarize' } }), 'create section');
  await ok(await api.post('/api/data/custom-fields', {
    data: {
      fieldType: 'input',
      label: 'Evidence Owner',
      display: 'finding',
      displaySub: 'Critical Findings',
      size: 6,
      description: 'Internal owner for remediation evidence',
      text: [{ locale: 'en', value: 'QA Lead' }, { locale: 'fr', value: 'Responsable QA' }],
    },
  }), 'create custom field');
  await ok(await api.post('/api/companies', { data: { name: 'Acme Corp', shortName: 'ACME' } }), 'create company');
  await ok(await api.post('/api/clients', {
    data: {
      company: { name: 'Acme Corp' },
      firstname: 'Jordan',
      lastname: 'Lee',
      email: 'security@acme.example',
      title: 'Security Manager',
    },
  }), 'create client');

  const template = await createTemplate(api);
  await ok(await api.post('/api/data/audit-types', {
    data: { name: 'Web Application', stage: 'default', templates: [{ locale: 'en', template: template._id }], sections: ['executive_summary'], hidden: [] },
  }), 'create default audit type');
  await ok(await api.post('/api/data/audit-types', {
    data: { name: 'Web Application Retest', stage: 'retest', templates: [{ locale: 'en', template: template._id }], sections: ['executive_summary'] },
  }), 'create retest audit type');

  await ok(await api.post('/api/vulnerabilities', { data: [{
    category: 'Critical Findings',
    cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L',
    cvssv4: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:L/SC:N/SI:N/SA:N',
    priority: 4,
    remediationComplexity: 2,
    details: [
      { locale: 'en', title: 'SQL Injection in Search Endpoint', vulnType: 'Web Application', description: '<p>Search input is concatenated into a SQL query.</p>', observation: '<p>Boolean SQL payloads changed response counts.</p>', remediation: '<p>Use parameterized queries.</p>', references: ['https://owasp.org/www-community/attacks/SQL_Injection'] },
      { locale: 'fr', title: 'Injection SQL dans le moteur de recherche', vulnType: 'Application Web', description: '<p>La saisie utilisateur est concatenee dans une requete SQL.</p>', observation: '<p>Les payloads SQL booleens modifient les resultats.</p>', remediation: '<p>Utiliser des requetes parametrees.</p>', references: ['https://owasp.org/www-community/attacks/SQL_Injection'] },
    ],
  }, {
    category: 'Critical Findings',
    cvssv3: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    cvssv4: 'CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N',
    priority: 2,
    remediationComplexity: 1,
    details: [{ locale: 'en', title: 'TLS Configuration Allows Legacy Ciphers', vulnType: 'Web Application', description: '<p>Legacy TLS ciphers are enabled.</p>', remediation: '<p>Disable weak ciphers and enforce modern TLS policies.</p>' }],
  }] }), 'create vulnerabilities');

  const auditRes = await ok(await api.post('/api/audits', {
    data: { name: 'Acme Web Application Pentest', language: 'en', auditType: 'Web Application', type: 'default' },
  }), 'create audit');
  const auditId = auditRes.datas.audit._id;

  const users = await ok(await api.get('/api/users'), 'get users');
  const reviewer = users.datas.find((user) => user.username === REVIEWER.username);
  const collaborator = users.datas.find((user) => user.username === COLLABORATOR.username);
  const companies = await ok(await api.get('/api/companies'), 'get companies');
  const clients = await ok(await api.get('/api/clients'), 'get clients');
  const company = companies.datas.find((item) => item.name === 'Acme Corp');
  const client = clients.datas.find((item) => item.email === 'security@acme.example');

  await ok(await api.put(`/api/audits/${auditId}/general`, {
    data: {
      name: 'Acme Web Application Pentest',
      company: { _id: company._id },
      client: client._id,
      date_start: '2026-06-01',
      date_end: '2026-06-10',
      date: '2026-06-11',
      scope: ['app.acme.example', '10.0.10.0/24'],
      template: template._id,
      collaborators: [{ _id: collaborator._id }],
      reviewers: [{ _id: reviewer._id }],
    },
  }), 'update audit general');

  const findingRes = await ok(await api.post(`/api/audits/${auditId}/findings`, { data: findingPayload() }), 'create finding');
  const audit = await ok(await api.get(`/api/audits/${auditId}`), 'get seeded audit');
  const finding = audit.datas.findings.find((item) => item.title === findingPayload().title) || findingRes.datas;
  const section = audit.datas.sections[0];

  const settings = await ok(await api.get('/api/settings'), 'get settings');
  settings.datas.report.public.scoringMethods.CVSS3 = true;
  settings.datas.report.public.scoringMethods.CVSS4 = true;
  settings.datas.report.public.enableSpellCheck = false;
  settings.datas.reviews.enabled = true;
  settings.datas.reviews.public.mandatoryReview = false;
  settings.datas.reviews.public.minReviewers = 1;
  settings.datas.reviews.private.removeApprovalsUponUpdate = false;
  await ok(await api.put('/api/settings', { data: settings.datas }), 'update settings');

  await api.dispose();
  return { auditId, findingId: finding._id, sectionId: section?._id };
}

async function recordAuditAuthoring(page, data) {
  await goto(page, '/audits', (p) => p.getByText('Acme Web Application Pentest').first());
  await sleep(700);
  await goto(page, `/audits/${data.auditId}/general`, (p) => p.getByText('General Information'));
  await sleep(700);

  // Add a finding from the vulnerability database
  await click(page, page.getByTestId('add-finding-button'));
  await page.getByLabel('Search').first().waitFor();
  await sleep(700);
  await fill(page, page.getByLabel('Search').first(), 'TLS Configuration');
  const vulnRow = page.getByRole('row').filter({ hasText: 'TLS Configuration Allows Legacy Ciphers' }).first();
  await vulnRow.waitFor();
  await sleep(500);
  await click(page, vulnRow.locator('button:has(i.fa-plus-circle)'));
  await sleep(900);

  await goto(page, `/audits/${data.auditId}/findings/${data.findingId}`, (p) => p.getByRole('tab', { name: 'Definition' }));
  await sleep(600);
  await click(page, page.getByRole('tab', { name: 'Proofs' }));
  await sleep(600);
  await click(page, page.getByRole('tab', { name: 'Details' }));
  await page.getByText(/CVSS.*4|CVSS v4/i).first().waitFor().catch(() => null);
  await sleep(800);

  // Highlight CVSS v4 metrics and affected assets
  const affectedAssetsField = page.locator('[for="affectedField"]').first();
  if (await affectedAssetsField.count()) {
    await moveTo(page, affectedAssetsField);
    await sleep(700);
  }
  const cvss4Section = page.locator('#cvss4Field');
  if (await cvss4Section.count()) {
    await moveTo(page, cvss4Section.first());
    await sleep(700);
  }

  await click(page, page.getByText(/Completed/i).first());
  await click(page, page.getByRole('button', { name: /Save/ }).first());
  await page.getByRole('button', { name: /Saved/ }).waitFor().catch(() => sleep(800));
  await goto(page, '/audits', (p) => p.getByText('Acme Web Application Pentest').first());
  const row = page.getByRole('row').filter({ hasText: 'Acme Web Application Pentest' }).first();
  await moveTo(page, row);
  await row.getByTestId('download-report-button').click();
  await sleep(1600);
}

async function recordVulnerabilityWorkflow(page, data) {
  // Search/filter and view a vulnerability with EN/FR details, CVSS, remediation, references, category
  await goto(page, '/vulnerabilities', (p) => p.getByRole('button', { name: 'New Vulnerability' }));
  await fill(page, page.getByTestId('search-vulnerability-title'), 'SQL Injection');
  let row = page.getByRole('row').filter({ hasText: 'SQL Injection in Search Endpoint' }).first();
  await row.waitFor();
  await click(page, row.getByTestId('edit-vulnerability-button'));
  await page.getByRole('dialog').getByText(/Edit Vulnerability/i).waitFor();
  await sleep(900);
  await click(page, page.locator('.q-dialog .q-select').nth(1));
  await click(page, page.getByRole('option', { name: /French|fr/i }).first());
  await sleep(900);
  await click(page, page.getByTestId('edit-vulnerability-close'));

  // Create a new vulnerability proposal from an audit finding
  await goto(page, `/audits/${data.auditId}/findings/${data.findingId}`, (p) => p.getByRole('tab', { name: 'Definition' }));
  await sleep(600);
  await click(page, page.getByRole('button', { name: /Propose Creation/i }));
  await sleep(1000);

  // Switch to admin validation queue, show the pending update, compare current vs proposed, and approve it
  await goto(page, '/vulnerabilities', (p) => p.getByTestId('search-vulnerability-title'));
  await fill(page, page.getByTestId('search-vulnerability-title'), 'SQL Injection');
  row = page.getByRole('row').filter({ hasText: 'SQL Injection in Search Endpoint' }).first();
  await row.waitFor();
  await sleep(500);
  await click(page, row.getByTestId('edit-vulnerability-button'));
  await page.getByRole('dialog').getByText('Update Vulnerability').waitFor();
  await sleep(1200);
  await click(page, page.getByRole('button', { name: /^Update$/i }));
  await sleep(900);
}

async function recordCollaborationReview(browser, data, adminState, collaboratorState, reviewerState) {
  const commentText = 'Can we confirm the affected endpoint name before this goes to review?';
  const replyText = 'Confirmed, it is the /api/search endpoint. Added to the finding scope.';
  const findingUrl = `/audits/${data.auditId}/findings/${data.findingId}`;

  // Phase 1: admin and collaborator side by side, creating, replying to, and resolving a comment
  const phase1 = await recordSideBySide(browser, adminState, collaboratorState, 'collaboration_review_phase1', async (adminPage, collabPage) => {
    await goto(adminPage, findingUrl, (p) => p.getByRole('tab', { name: 'Definition' }));
    await goto(collabPage, findingUrl, (p) => p.getByRole('tab', { name: 'Definition' }));
    await sleep(600);

    // Both open the comments panel for this audit
    await click(adminPage, adminPage.locator('button:has(i:has-text("mode_comment"))').first());
    await click(collabPage, collabPage.locator('button:has(i:has-text("mode_comment"))').first());
    await sleep(700);

    // Collaborator starts a new comment thread on the finding title
    await click(collabPage, collabPage.locator('.q-badge.cursor-pointer:has(i:has-text("add_comment"))').first());
    const commentInput = collabPage.getByPlaceholder('Start a conversation');
    await commentInput.waitFor();
    await fill(collabPage, commentInput, commentText);
    await click(collabPage, collabPage.locator('.sidebar-comments button:has(i:has-text("done"))').first());
    await sleep(900);

    // Admin reloads to pick up the new comment, then replies and resolves it
    await adminPage.reload();
    await adminPage.getByRole('tab', { name: 'Definition' }).waitFor();
    await click(adminPage, adminPage.locator('button:has(i:has-text("mode_comment"))').first());
    await adminPage.getByText(commentText, { exact: false }).first().waitFor();
    await sleep(500);
    await click(adminPage, adminPage.locator('.sidebar-comments .q-card').first());
    const replyInput = adminPage.getByPlaceholder('Reply');
    await fill(adminPage, replyInput, replyText);
    await click(adminPage, adminPage.locator('.sidebar-comments button:has(i:has-text("send"))').first());
    await sleep(800);
    await click(adminPage, adminPage.locator('.sidebar-comments button:has(i:has-text("done"))').first());
    await sleep(900);
  });

  // Phase 2: admin submits the audit for review, reviewer approves it side by side
  // Reuse phase1's admin storage state: the boot/auth refresh flow rotates the
  // refreshToken cookie on each page load, so the original adminState is stale.
  const phase2 = await recordSideBySide(browser, phase1.leftState, reviewerState, 'collaboration_review_phase2', async (adminPage, reviewerPage) => {
    await goto(adminPage, findingUrl, (p) => p.getByRole('button', { name: 'Submit Review' }));
    await goto(reviewerPage, findingUrl, (p) => p.getByRole('tab', { name: 'Definition' }));
    await sleep(600);

    await click(adminPage, adminPage.getByRole('button', { name: 'Submit Review' }));
    await sleep(900);

    await reviewerPage.reload();
    const approveButton = reviewerPage.getByRole('button', { name: 'Approve' });
    await approveButton.waitFor();
    await sleep(600);
    await click(reviewerPage, approveButton);
    await sleep(1000);

    await goto(adminPage, '/audits', (p) => p.getByText('Acme Web Application Pentest').first());
    await adminPage.getByText('Approved').first().waitFor().catch(() => null);
    await sleep(1200);
  });

  const combinedDir = path.join('/tmp', 'pwndoc-demo-videos', 'collaboration_review');
  fs.mkdirSync(combinedDir, { recursive: true });
  const phase1Combined = path.join(combinedDir, 'phase1.webm');
  const phase2Combined = path.join(combinedDir, 'phase2.webm');
  await hstackVideos(phase1.leftPath, phase1.rightPath, phase1Combined);
  await hstackVideos(phase2.leftPath, phase2.rightPath, phase2Combined);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const finalVideo = path.join(OUTPUT_DIR, 'collaboration_review.webm');
  await concatVideos([phase1Combined, phase2Combined], finalVideo);
  await convertVideoToGif(finalVideo, path.join(OUTPUT_DIR, 'collaboration_review.gif'));
}

async function putDraft(page, userId, scope, refKey, data) {
  await page.evaluate(async ({ userId, scope, refKey, data }) => {
    const request = indexedDB.open('pwndoc-drafts', 1);
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'key' });
          store.createIndex('by_userId', 'userId');
          store.createIndex('by_updatedAt', 'updatedAt');
        }
      };
    });
    const now = Date.now();
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put({
      key: `pwndoc.draft.${userId}.${scope}.${refKey}`,
      v: 1,
      scope,
      refKey,
      userId,
      createdAt: now,
      updatedAt: now,
      status: 'active_draft',
      data,
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { userId, scope, refKey, data });
}

async function recordRetestDraftRecovery(page, data, adminState) {
  // Create a retest audit from the original audit
  await goto(page, `/audits/${data.auditId}/general`, (p) => p.getByText('General Information'));
  await click(page, page.getByRole('button', { name: /Create Retest/i }));
  await page.waitForURL(/\/audits\/[0-9a-fA-F]{24}/);
  await sleep(1000);
  const retestId = page.url().match(/\/audits\/([0-9a-fA-F]{24})/)[1];
  data.retestId = retestId;

  const api = await apiContext(adminState);
  const retestDetail = await ok(await api.get(`/api/audits/${retestId}`), 'get retest detail');
  const retestFinding = retestDetail.datas.findings.find((item) => item.title === findingPayload().title) || retestDetail.datas.findings[0];
  data.retestFindingId = retestFinding._id;

  // Set retest status and description for the finding via the UI
  await goto(page, `/audits/${retestId}/findings/${data.retestFindingId}`, (p) => p.locator('#retestStatusField'));
  await sleep(700);
  await click(page, page.getByText(/Partially Corrected/i).first());
  const retestDescriptionEditor = page.locator('.q-field:has(#retestDescriptionField) [contenteditable="true"]');
  await click(page, retestDescriptionEditor);
  await page.keyboard.type('The endpoint is parameterized, but one reporting filter still needs confirmation.');
  await sleep(500);
  await click(page, page.getByRole('button', { name: /Save/ }).first());
  await page.getByRole('button', { name: /Saved/ }).waitFor().catch(() => sleep(800));
  await sleep(800);

  // Split view and local draft recovery
  await click(page, page.getByTestId('retest-split-view-toggle'));
  await page.getByTestId('retest-original-panel').waitFor().catch(() => null);
  await sleep(1200);

  const me = await ok(await api.get('/api/users/me'), 'get me for draft');
  const finding = await ok(await api.get(`/api/audits/${retestId}/findings/${data.retestFindingId}`), 'get retest finding');
  await api.dispose();
  await goto(page, '/audits', (p) => p.getByText('Acme Web Application Pentest').first());
  await putDraft(page, me.datas._id, 'audit-finding', `${data.retestId}:${data.retestFindingId}`, {
    ...finding.datas,
    retestDescription: '<p>Recovered local draft: one legacy report export endpoint still needs manual verification.</p>',
    retestStatus: 'partial',
  });
  await goto(page, `/audits/${data.retestId}/findings/${data.retestFindingId}`, (p) => p.getByTestId('draft-recovery-status'));
  await click(page, page.getByTestId('draft-recovery-status'));
  await click(page, page.getByText(/View changes/i).first());
  await page.getByText(/Recovered local draft|Retest Description/i).first().waitFor();
  await sleep(1200);
  await page.keyboard.press('Escape');
  await click(page, page.getByTestId('draft-recovery-status'));
  await click(page, page.getByText(/Revert to saved version/i).first());
  await sleep(700);
  await click(page, page.getByTestId('draft-recovery-status'));
  await click(page, page.getByText(/Restore recovered changes/i).first());
  await sleep(900);
}

async function recordCustomizationOperations(page) {
  await goto(page, '/data/custom', (p) => p.getByText('Languages').first());
  await click(page, page.getByRole('tab', { name: /Audit Types/i }));
  await sleep(700);
  await click(page, page.getByRole('tab', { name: /Custom Fields/i }));
  await page.getByText(/Custom Fields|Display|Field Type/i).first().waitFor();
  await page.getByText('Evidence Owner').waitFor({ timeout: 5000 }).catch(() => null);
  await sleep(800);

  // Create a new custom field for audit findings
  const customFieldPanel = page.locator('.q-tab-panel').filter({ hasText: 'Create and manage Custom Fields' });
  await click(page, customFieldPanel.locator('.q-select').first());
  await click(page, page.getByRole('option', { name: 'Audit Finding' }));
  await sleep(400);
  await click(page, customFieldPanel.locator('.q-select').nth(1));
  await click(page, page.getByRole('option', { name: 'Critical Findings' }));
  await sleep(400);
  await click(page, customFieldPanel.locator('.q-select').nth(2));
  await click(page, page.getByRole('option', { name: 'Input' }).first());
  await sleep(400);
  await fill(page, customFieldPanel.locator('.q-input').first(), 'Severity Justification');
  await click(page, customFieldPanel.getByRole('button', { name: 'Add' }));
  await sleep(900);

  // Custom fields only apply to findings created after they're defined, so create a new
  // audit and add a finding to it to show the new field appearing
  await goto(page, '/audits', (p) => p.getByRole('button', { name: 'New Audit' }));
  await click(page, page.getByRole('button', { name: 'New Audit' }));
  const createAuditDialog = page.getByRole('dialog').filter({ hasText: 'Create Audit' });
  await createAuditDialog.waitFor();
  await sleep(500);
  await fill(page, createAuditDialog.getByLabel(/Name/i), 'Acme Mobile API Assessment');
  await click(page, createAuditDialog.locator('.q-select').first());
  await click(page, page.getByRole('option', { name: 'Web Application' }));
  await sleep(300);
  await click(page, createAuditDialog.locator('.q-select').last());
  await click(page, page.getByRole('option', { name: 'English' }));
  await sleep(300);
  await click(page, createAuditDialog.getByRole('button', { name: /^Create$/ }));
  await page.waitForURL(/\/audits\/[0-9a-fA-F]{24}/);
  await page.getByText('General Information').waitFor();
  await sleep(800);

  // Add a finding from the vulnerability database to the new audit
  await click(page, page.getByTestId('add-finding-button'));
  await page.getByLabel('Search').first().waitFor();
  await sleep(700);
  await fill(page, page.getByLabel('Search').first(), 'TLS Configuration');
  const newAuditVulnRow = page.getByRole('row').filter({ hasText: 'TLS Configuration Allows Legacy Ciphers' }).first();
  await newAuditVulnRow.waitFor();
  await sleep(500);
  await click(page, newAuditVulnRow.locator('button:has(i.fa-plus-circle)'));
  await sleep(900);

  // Open the new finding and show the new custom field appearing on it
  await click(page, page.getByText('TLS Configuration Allows Legacy Ciphers').first());
  await page.getByRole('tab', { name: 'Definition' }).waitFor();
  await sleep(600);
  const severityJustificationField = page.getByText('Severity Justification').first();
  await severityJustificationField.waitFor().catch(() => null);
  if (await severityJustificationField.count()) {
    await severityJustificationField.scrollIntoViewIfNeeded();
    await sleep(900);
  }

  // Custom Sections tab
  await goto(page, '/data/custom', (p) => p.getByText('Languages').first());
  await click(page, page.getByRole('tab', { name: /Custom Sections/i }));
  await sleep(800);

  await goto(page, '/settings', (p) => p.getByText('General Settings').first());
  await sleep(600);

  // Slowly scroll down through the settings sections before reaching Backups
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 350);
    await sleep(500);
  }
  await page.getByTestId('create-backup-button').scrollIntoViewIfNeeded();
  await sleep(800);
  await click(page, page.getByTestId('create-backup-button'));
  await fill(page, page.getByTestId('create-backup-name-input'), 'Acme Demo Backup');
  await click(page, page.getByText(/Enable Encryption/i).first());
  const passwordField = page.getByLabel(/Password/i).first();
  await fill(page, passwordField, 'DemoBackupP@ss123');
  await click(page, page.getByRole('dialog').getByRole('button', { name: /^Create$/ }));
  const backupRow = page.getByRole('row').filter({ hasText: 'Acme Demo Backup' });
  await backupRow.waitFor({ timeout: 30000 }).catch(() => null);
  await sleep(1000);
  await click(page, backupRow.getByTestId('download-backup-button'));
  await sleep(1000);
  await goto(page, '/profile', (p) => p.getByText(/Two-Factor|TOTP|Profile/i).first());
  await click(page, page.getByText(/Enable|TOTP|Two-Factor/i).first());
  await page.getByText(/generated token|TOTP Token|QR/i).first().waitFor().catch(() => null);
  await sleep(1200);
}

async function main() {
  const adminState = await initAdmin();
  const data = await seedData(adminState);
  const collaboratorState = await loginApi(COLLABORATOR.username, COLLABORATOR.password);
  const reviewerState = await loginApi(REVIEWER.username, REVIEWER.password);
  const browser = await chromium.launch();

  try {
    for (const [filename, fn] of demos) {
      console.log(`Recording ${filename}`);
      const currentAdminState = await loginApi(ADMIN.username, ADMIN.password);
      if (filename === 'collaboration_review.gif') {
        await fn(browser, data, currentAdminState, collaboratorState, reviewerState);
      } else {
        await record(browser, currentAdminState, filename, async (page) => {
          if (filename === 'retest_draft_recovery.gif')
            await fn(page, data, currentAdminState);
          else
            await fn(page, data);
        });
      }
      console.log(`Wrote ${path.join(OUTPUT_DIR, filename)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
