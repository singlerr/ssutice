import { chromium, type BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_STATE_PATH = path.join(__dirname, 'storage-state.json');
const ENV_LOCAL_PATH = path.join(__dirname, '..', '..', '..', '.env.local');

const IG_LOGIN_URL = 'https://www.instagram.com/accounts/login/';
const IG_HOME_URL = 'https://www.instagram.com/';

/** Wait up to 120s for the user to finish login (including 2FA/challenge). */
const LOGIN_TIMEOUT_MS = 120_000;

/**
 * Launch a headed Chromium, log into Instagram (reusing saved browser state
 * when possible), extract the `sessionid` cookie, and write it to `.env.local`.
 *
 * Must be run locally — Instagram blocks headless / server-IP login attempts.
 */
export async function refreshSession(): Promise<{ sessionId: string }> {
  console.log('[ig-auth] Launching Chromium (headed)...');

  const hasStorageState = fs.existsSync(STORAGE_STATE_PATH);
  const storageState = hasStorageState ? STORAGE_STATE_PATH : undefined;

  if (hasStorageState) {
    console.log('[ig-auth] Found saved browser state — will try to reuse session.');
  }

  const browser = await chromium.launch({ headless: false });

  let context: BrowserContext;
  try {
    context = await browser.newContext({ storageState });
  } catch {
    // storage-state.json may be corrupt; start fresh
    console.warn('[ig-auth] Saved browser state is invalid — starting fresh.');
    context = await browser.newContext();
  }

  const page = await context.newPage();

  // Navigate to Instagram. If session is still valid we'll land on the feed.
  await page.goto(IG_HOME_URL, { waitUntil: 'domcontentloaded' });

  // Check if we actually have a valid session by looking for the sessionid cookie.
  // URL-based checks are unreliable — Instagram may show a login wall at / without redirecting.
  const existingCookies = await context.cookies(['https://www.instagram.com']);
  const hasSession = existingCookies.some((c) => c.name === 'sessionid' && c.value.length > 0);

  if (hasSession) {
    console.log('[ig-auth] Found existing sessionid cookie — session appears valid.');
  } else {
    // Need to log in.
    console.log('[ig-auth] No valid session found. Opening login page...');
    await page.goto(IG_LOGIN_URL, { waitUntil: 'networkidle' });

    const username = process.env.IG_USERNAME ?? '';
    const password = process.env.IG_PASSWORD ?? '';

    if (!username || !password) {
      console.log(
        '[ig-auth] No IG_USERNAME / IG_PASSWORD in environment.\n' +
          '  Please log in manually in the browser window.'
      );
    } else {
      // Dismiss cookie dialog if present (EU)
      try {
        const allowBtn = page.locator('button', { hasText: /Allow|허용|Only Allow/ }).first();
        if (await allowBtn.isVisible({ timeout: 2000 })) {
          await allowBtn.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // No cookie dialog — fine
      }

      try {
        const usernameInput = page.locator('input[name="username"]').first();
        const passwordInput = page.locator('input[name="password"]').first();

        if (await usernameInput.isVisible({ timeout: 3000 })) {
          await usernameInput.fill(username);
          await passwordInput.fill(password);
          await passwordInput.press('Enter');
          console.log('[ig-auth] Credentials submitted. Resolve any challenge/2FA in the browser.');
        }
      } catch {
        console.log(
          '[ig-auth] Could not auto-fill credentials. Please log in manually.'
        );
      }
    }

    // Wait for login to complete (URL leaves /accounts/login or /challenge)
    console.log('[ig-auth] Waiting for login to complete (timeout: 120s)...');
    try {
      await page.waitForURL(
        (url) => {
          const href = url.toString();
          return !href.includes('/accounts/login') && !href.includes('/challenge');
        },
        { timeout: LOGIN_TIMEOUT_MS }
      );
    } catch {
      await browser.close();
      throw new Error(
        '[ig-auth] Login timed out. Please try again and complete login within 120 seconds.'
      );
    }

    // Wait a moment for cookies to settle after redirect
    await page.waitForTimeout(2000);
  }


  console.log('[ig-auth] Login confirmed. Extracting sessionid cookie...');

  // Navigate to instagram.com to ensure we have the right cookies
  if (!page.url().startsWith(IG_HOME_URL)) {
    await page.goto(IG_HOME_URL, { waitUntil: 'domcontentloaded' });
  }

  const cookies = await context.cookies(['https://www.instagram.com']);
  const sessionCookie = cookies.find((c) => c.name === 'sessionid');

  if (!sessionCookie) {
    const cookieNames = cookies.map((c) => c.name).join(', ');
    console.error(`[ig-auth] Cookies found: ${cookieNames || '(none)'}`);
    console.error(`[ig-auth] Current URL: ${page.url()}`);
    await browser.close();
    throw new Error(
      '[ig-auth] sessionid cookie not found. Login may not have completed.\n' +
      '  Check the browser window — you may need to complete a challenge or try again.'
    );
  }

  const sessionId = sessionCookie.value;

  // Save browser state for future reuse
  const state = await context.storageState();
  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  console.log('[ig-auth] Browser state saved.');

  await browser.close();

  // Update .env.local
  updateEnvLocal(sessionId);
  console.log('[ig-auth] .env.local updated with new IG_SESSION_ID.');

  return { sessionId };
}

/**
 * Replace or append `IG_SESSION_ID=...` in `.env.local`.
 */
function updateEnvLocal(sessionId: string): void {
  const dir = path.dirname(ENV_LOCAL_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = '';
  if (fs.existsSync(ENV_LOCAL_PATH)) {
    content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
  }

  const lines = content.split('\n');
  const keyPattern = /^IG_SESSION_ID\s*=/;
  let replaced = false;

  for (let i = 0; i < lines.length; i++) {
    if (keyPattern.test(lines[i])) {
      lines[i] = `IG_SESSION_ID=${sessionId}`;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    // Append (ensure newline before if file has content)
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push(`IG_SESSION_ID=${sessionId}`);
  }

  fs.writeFileSync(ENV_LOCAL_PATH, lines.join('\n'), 'utf-8');
}
