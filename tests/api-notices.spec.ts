import { test, expect } from '@playwright/test';

test.describe('/api/notices', () => {
  test('returns notices with thumbnail_url field', async ({ request }) => {
    const resp = await request.get('/api/notices?limit=5');
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(body).toHaveProperty('notices');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.notices)).toBe(true);

    // If any notices exist, verify the response shape includes thumbnail_url
    if (body.notices.length > 0) {
      const notice = body.notices[0];
      expect(notice).toHaveProperty('id');
      expect(notice).toHaveProperty('provider');
      expect(notice).toHaveProperty('article_no');
      expect(notice).toHaveProperty('title');
      expect(notice).toHaveProperty('url');
      expect(notice).toHaveProperty('date');
      // thumbnail_url must be present (can be null)
      expect(notice).toHaveProperty('thumbnail_url');
    }
  });

  test('filters by Instagram category ig-focussu', async ({ request }) => {
    const resp = await request.get('/api/notices?category=ig-focussu&limit=10');
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(Array.isArray(body.notices)).toBe(true);
    // Every returned notice should belong to ig-focussu
    for (const notice of body.notices) {
      expect(notice.provider).toBe('ig-focussu');
    }
  });

  test('filters by Instagram category ig-it', async ({ request }) => {
    const resp = await request.get('/api/notices?category=ig-it&limit=10');
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    for (const notice of body.notices) {
      expect(notice.provider).toBe('ig-it');
    }
  });

  test('filters by Instagram category ig-cse-council', async ({ request }) => {
    const resp = await request.get('/api/notices?category=ig-cse-council&limit=10');
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    for (const notice of body.notices) {
      expect(notice.provider).toBe('ig-cse-council');
    }
  });

  test('rejects invalid category gracefully', async ({ request }) => {
    const resp = await request.get('/api/notices?category=invalid-category');
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    // Invalid category should fall back to 'all' — not error
    expect(Array.isArray(body.notices)).toBe(true);
  });
});
