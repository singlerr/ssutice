import { insertNotice } from '../db';
import { sendToAll } from '../push';
import { scrapeUniversity } from './university';
import { scrapeCSE } from './cse';
import { scrapeStudentCouncil } from './student-council';
import { scrapeSW } from './sw';

const PROVIDERS = [
  { key: 'university', label: '숭실대학교', scrape: scrapeUniversity },
  { key: 'cse', label: '컴퓨터학부', scrape: scrapeCSE },
  { key: 'student-council', label: '총학생회', scrape: scrapeStudentCouncil },
  { key: 'sw', label: '소프트웨어학부', scrape: scrapeSW },
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
          notice.date
        );
        if (isNew) {
          newCount++;
          // Fire-and-forget push — don't block scrape on push failures
          sendToAll(
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
