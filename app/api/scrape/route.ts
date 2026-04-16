import { initDb } from '@/lib/db';
import { runAllScrapers } from '@/lib/scrapers/index';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initDb();
    const newCount = await runAllScrapers();
    return Response.json({ ok: true, newCount });
  } catch (err) {
    console.error('[scrape] error:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
