import * as cheerio from 'cheerio';

export type ScrapedNotice = {
  articleNo: string;
  title: string;
  url: string;
  date: string | null;
};

// Fetch multiple pages to get more notices
const BASE_URL = 'https://scatch.ssu.ac.kr/%ea%b3%b5%ec%a7%80%ec%82%ac%ed%95%ad/';

async function fetchPage(page: number): Promise<ScrapedNotice[]> {
  const url = page === 1 ? BASE_URL : `${BASE_URL}?paged=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SSUNoticeBot/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`university fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const notices: ScrapedNotice[] = [];

  $('.notice_col3 > a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href) return;

    // Extract unique identifier from 'slug' query param
    let articleNo = '';
    try {
      const parsed = new URL(href);
      articleNo = parsed.searchParams.get('slug') ??
                  parsed.searchParams.get('p_replace_code') ??
                  href;
    } catch {
      articleNo = href;
    }

    // Title: the anchor contains category span text + actual title
    // Split by whitespace clusters and take the last non-empty segment
    const rawText = $(el).text().trim();
    const parts = rawText.split(/\s{2,}|\n|\t/).map(s => s.trim()).filter(Boolean);
    const title = parts[parts.length - 1] || rawText;
    if (!title || title.length < 2) return;

    // Date: look for date in parent li — date is in .notice_col1 .h2
    const li = $(el).closest('li');
    const dateText = li.find('.notice_col1 .h2').first().text().trim();

    if (!notices.find((n) => n.articleNo === articleNo)) {
      notices.push({ articleNo, title, url: href, date: dateText || null });
    }
  });

  return notices;
}

export async function scrapeUniversity(): Promise<ScrapedNotice[]> {
  // Fetch first 3 pages (≈45 notices)
  const pages = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);
  const all = pages.flat();
  // Deduplicate
  const seen = new Set<string>();
  return all.filter(n => {
    if (seen.has(n.articleNo)) return false;
    seen.add(n.articleNo);
    return true;
  });
}
