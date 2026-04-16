import * as cheerio from 'cheerio';

export type ScrapedNotice = {
  articleNo: string;
  title: string;
  url: string;
  date: string | null;
};

const BASE_URL = 'https://cse.ssu.ac.kr/bbs/board.php?bo_table=notice';
const ORIGIN = 'https://cse.ssu.ac.kr';

export async function scrapeCSE(): Promise<ScrapedNotice[]> {
  const res = await fetch(BASE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SSUNoticeBot/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`cse fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const notices: ScrapedNotice[] = [];

  // Selector confirmed: td.td_subject a (inside .bo_list tbody)
  $('td.td_subject a, .bo_list tbody tr td a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim().replace(/\s+/g, ' ').replace(/^NEW\s*/i, '');
    if (!href || !title || title.length < 2) return;

    const fullUrl = href.startsWith('http') ? href : `${ORIGIN}${href.startsWith('/') ? '' : '/'}${href}`;

    let articleNo = '';
    try {
      const url = new URL(fullUrl);
      articleNo = url.searchParams.get('wr_id') ?? url.searchParams.get('idx') ?? url.searchParams.get('no') ?? fullUrl;
    } catch {
      articleNo = href;
    }

    const row = $(el).closest('tr');
    const dateText = row.find('td.td_datetime').first().text().trim();

    if (!notices.find((n) => n.articleNo === articleNo)) {
      notices.push({ articleNo, title, url: fullUrl, date: dateText || null });
    }
  });

  return notices.slice(0, 20);
}
