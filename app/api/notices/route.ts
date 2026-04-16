import { getNotices, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await initDb();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));

    const data = await getNotices(page, limit, q);
    return Response.json(data);
  } catch (err) {
    console.error('[notices] DB error:', err);
    return Response.json({ notices: [], total: 0, error: 'DB not configured' }, { status: 200 });
  }
}
