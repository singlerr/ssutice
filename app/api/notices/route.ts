import { getNotices, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await initDb();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));

    const validCategories = ['all', 'university', 'cse', 'student-council'];
    const safeCategory = validCategories.includes(category) ? category : 'all';

    const data = await getNotices(safeCategory, page, limit);
    return Response.json(data);
  } catch (err) {
    console.error('[notices] DB error:', err);
    return Response.json({ notices: [], total: 0, error: 'DB not configured' }, { status: 200 });
  }
}
