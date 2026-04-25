#!/usr/bin/env npx tsx
/**
 * Instagram session refresh CLI.
 *
 * Usage:
 *   npx tsx scripts/ig-refresh.ts
 *
 * Optionally set IG_USERNAME and IG_PASSWORD in .env.local to auto-fill
 * credentials. Otherwise log in manually in the opened browser window.
 *
 * Must be run on a local machine with a display (headed Chromium).
 * After completion, restart the Next.js dev server to pick up the new
 * IG_SESSION_ID from .env.local.
 */
import { refreshSession } from '../lib/ig-auth/refresh-session';

async function main() {
  console.log('=== Instagram Session Refresh ===\n');

  try {
    const { sessionId } = await refreshSession();
    console.log(`\nSession refreshed successfully.`);
    console.log(`sessionid (first 20 chars): ${sessionId.slice(0, 20)}...`);
    console.log(`\nRestart your Next.js dev server to use the new session.`);
  } catch (err) {
    console.error(`\nFailed to refresh session:`, err);
    process.exit(1);
  }
}

main();
