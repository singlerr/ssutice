import { InstagramScraper } from '@aduptive/instagram-scraper';

export type ScrapedNotice = {
  articleNo: string;
  title: string;
  url: string;
  date: string | null;
};

// Shared scraper instance. Set IG_SESSION_ID env var (the `sessionid` cookie value
// from a logged-in browser) for reliable scraping — Instagram rate-limits
// unauthenticated server requests with 429.
let _scraper: InstagramScraper | null = null;

function getScraper(): InstagramScraper {
  if (!_scraper) {
    _scraper = new InstagramScraper({ minDelay: 1500, maxDelay: 3000 });
    const sessionId = process.env.IG_SESSION_ID;
    if (sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_scraper as any).axios.defaults.headers.common['Cookie'] = `sessionid=${sessionId}`;
    }
  }
  return _scraper;
}

export function createInstagramScraper(username: string) {
  return async function scrapeInstagram(): Promise<ScrapedNotice[]> {
    const result = await getScraper().getPosts(username, 20);

    if (!result.success || !result.posts) {
      throw new Error(
        `instagram scrape failed for @${username}: ${result.error ?? 'unknown'} (${result.code ?? '?'})`
      );
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
      };
    });
  };
}
