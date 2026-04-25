import { InstagramScraper } from '@aduptive/instagram-scraper';

export type ScrapedNotice = {
  articleNo: string;
  title: string;
  url: string;
  date: string | null;
  thumbnail_url?: string;
};

// Shared scraper instance. Set IG_SESSION_ID env var (the `sessionid` cookie value
// from a logged-in browser) for reliable scraping — Instagram rate-limits
// unauthenticated server requests with 429.
let _scraper: InstagramScraper | null = null;

function getScraper(): InstagramScraper {
  if (!_scraper) {
    _scraper = new InstagramScraper({ minDelay: 1500, maxDelay: 3000 });
    const raw = process.env.IG_SESSION_ID;
    if (raw) {
      // Decode URL-encoded session ID (e.g. %3A → :)
      const sessionId = decodeURIComponent(raw);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_scraper as any).axios.defaults.headers.common['Cookie'] = `sessionid=${sessionId}`;
    }
  }
  return _scraper;
}

export function createInstagramScraper(username: string) {
  const MAX_RETRIES = 2;
  const BASE_DELAY = 2000; // 2s → 4s → 8s

  return async function scrapeInstagram(): Promise<ScrapedNotice[]> {
    const scraper = getScraper();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const result = await scraper.getPosts(username, 20);

      if (result.success && result.posts) {
        if (result.posts.length === 0) {
          console.warn(`[@${username}] scrape returned 0 posts`);
        }
        return result.posts.map((post) => {
          const caption = post.caption ?? '';
          const firstLine = caption.split('\n')[0].replace(/#\S+/g, '').trim();
          const title = (firstLine || `@${username} 게시글`).slice(0, 120);
          // taken_at_timestamp is in seconds; timestamp field may be seconds or ms
          const ts = post.timestamp > 1e10 ? post.timestamp : post.timestamp * 1000;
          const date = post.timestamp ? new Date(ts).toISOString().slice(0, 10) : null;
          return {
            articleNo: post.shortcode,
            title,
            url: post.url ?? `https://www.instagram.com/p/${post.shortcode}/`,
            date,
            thumbnail_url: post.thumbnail_url ?? post.display_url,
          };
        });
      }

      // Classify error
      const code = result.code ?? '';
      const isRateLimit = code === 'RATE_LIMITED' || String(result.error).includes('429');
      const isAuthFailure = code === 'ACCESS_DENIED' || code === 'LOGIN_REQUIRED';

      if (isAuthFailure) {
        console.error(
          '[ig-auth] Instagram session expired. Run: npx tsx scripts/ig-refresh.ts'
        );
        throw new Error(
          `[@${username}] auth failed: ${result.error} (${code}). Check IG_SESSION_ID. Run: npx tsx scripts/ig-refresh.ts`
        );
      }

      // Retry on rate limits and transient errors
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        const reason = isRateLimit ? 'rate limited' : 'transient error';
        console.warn(`[@${username}] ${reason}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${result.error}`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Final attempt failed
      throw new Error(
        `[@${username}] scrape failed after ${MAX_RETRIES + 1} attempts: ${result.error ?? 'unknown'} (${code})`
      );
    }

    // Unreachable but satisfies type checker
    return [];
  };
}
