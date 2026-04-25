# Instagram Scraper Implementation Plan

## Context

9-run autoresearch completed. The project (ssutice) is a Next.js 16 campus notice aggregator at Soongsil University with:
- @aduptive/instagram-scraper (v1.0.3) installed and working (HTTP API, no browser)
- 3 Instagram sources: focussu.66th, it_soongsil, ssu_cse
- Turso (libSQL) database with notices table
- Push notification system with per-provider subscriptions
- Vercel deployment (cannot run headless browsers)

## Decision

The existing scraper already provides everything the current UI needs (post lists, captions, shortcodes, URLs, timestamps). The NoticeCard shows provider badge + title + date + link. No images are displayed.

Patchright enrichment is NOT needed for the current UI. Focus on making the existing integration more robust.

## Tasks

### Task 1: Extend DB schema for thumbnails

File: lib/db.ts
- Add migration: ALTER TABLE notices ADD COLUMN thumbnail_url TEXT (try/catch like existing patterns)
- Add thumbnail_url to Notice type
- Update insertNotice to accept optional thumbnail_url
- Update getNotices to return thumbnail_url

### Task 2: Update Instagram scraper to pass thumbnail

File: lib/scrapers/instagram.ts
- Add thumbnail_url?: string to local ScrapedNotice type
- Map post.display_url to thumbnail_url in the return object

### Task 3: Update insertNotice call chain

File: lib/scrapers/index.ts
- Pass thumbnail_url from scraped notices to insertNotice

### Task 4: Improve error handling in Instagram scraper

File: lib/scrapers/instagram.ts
- Add retry for 429 with exponential backoff (2s, 4s, 8s)
- Log meaningful errors (rate limited vs auth failure vs empty)

### Task 5: Update provider metadata

File: components/NoticeCard.tsx
- Add Instagram entries to PROVIDER_META with gradient colors:
  ig-focussu: purple-to-pink
  ig-it: orange-to-pink
  ig-cse-council: yellow-to-pink

### Task 6: Clean up env vars

File: .env.local.example
- Remove IG_USERNAME and IG_PASSWORD (stale Puppeteer creds)
- Keep IG_SESSION_ID with improved docs

### Task 7: Scaffold Patchright enrichment module

File: lib/scrapers/instagram-enrich.ts (new, dev only)
- enrichPost(postUrl) for og:meta extraction
- enrichViaEmbed(shortcode) for exact likes/caption
- Not imported by any production code
- Add patchright to devDependencies
- Add enrich:ig script to package.json

## Files to modify

| File | Change |
|------|--------|
| lib/db.ts | Add thumbnail_url column + type + insert/select |
| lib/scrapers/instagram.ts | Pass thumbnail_url, improve error handling |
| lib/scrapers/index.ts | Pass thumbnail_url through |
| components/NoticeCard.tsx | Add Instagram provider meta |
| .env.local.example | Remove Puppeteer creds |
| lib/scrapers/instagram-enrich.ts | New: Patchright scaffold (dev only) |
| package.json | Add patchright to devDependencies |

## Verification

1. npm run build passes
2. Instagram scraper returns valid data
3. thumbnail_url column added without breaking existing data
4. NoticeCard renders Instagram badges correctly
5. .env.local.example has no Puppeteer credentials
6. instagram-enrich.ts compiles but is not imported in production
