import { insertNotice } from '../db';
import { sendToProvider } from '../push';
import { scrapeUniversity } from './university';
import { scrapeCSE } from './cse';
import { scrapeStudentCouncil } from './student-council';
import { scrapeSW } from './sw';
import { createInstagramScraper } from './instagram';

const PROVIDERS = [
  { key: 'university', label: '숭실대학교', scrape: scrapeUniversity },
  { key: 'cse', label: '컴퓨터학부', scrape: scrapeCSE },
  { key: 'student-council', label: '총학생회', scrape: scrapeStudentCouncil },
  { key: 'sw', label: '소프트웨어학부', scrape: scrapeSW },
  { key: 'ig-focussu', label: '총학생회 인스타', scrape: createInstagramScraper('focussu.66th') },
  { key: 'ig-it', label: 'IT대학 학생회', scrape: createInstagramScraper('it_soongsil') },
  { key: 'ig-cse-council', label: '컴퓨터학부 학생회', scrape: createInstagramScraper('ssu_cse') },
] as const;

export async function runAllScrapers(): Promise<number> {
  let newCount = 0;

  for (const provider of PROVIDERS) {
    try {
      const notices = await provider.scrape();
      for (const notice of notices) {
        const isNew = await insertNotice(
          provider.key,
          notice.articleNo,
          notice.title,
          notice.url,
          notice.date,
          'thumbnail_url' in notice ? (notice as { thumbnail_url?: string }).thumbnail_url ?? null : null
        );
        if (isNew) {
          newCount++;
          // Fire-and-forget push — don't block scrape on push failures
          sendToProvider(
            provider.key,
            `[${provider.label}] 새 공지사항`,
            notice.title,
            notice.url
          ).catch((err) => console.error('push error:', err));
        }
      }
    } catch (err) {
      console.error(`Scrape failed for ${provider.key}:`, err);
    }
  }

  return newCount;
}
