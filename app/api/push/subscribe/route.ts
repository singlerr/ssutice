import { initDb, upsertSubscription } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await initDb();
  const body = await request.json();
  const { endpoint, keys } = body?.subscription ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await upsertSubscription(endpoint, keys.p256dh, keys.auth);
  return Response.json({ ok: true });
}
