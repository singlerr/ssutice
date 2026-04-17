import {
  initDb,
  upsertSubscription,
  updateSubscriptionProviders,
  deleteSubscription,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await initDb();
  const body = await request.json();
  const { endpoint, keys } = body?.subscription ?? {};
  const providers: string[] = Array.isArray(body?.providers) ? body.providers : ['all'];

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await upsertSubscription(endpoint, keys.p256dh, keys.auth, providers);
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  await initDb();
  const body = await request.json();
  const { endpoint, providers } = body ?? {};

  if (!endpoint || !Array.isArray(providers)) {
    return Response.json({ error: 'Missing endpoint or providers' }, { status: 400 });
  }

  await updateSubscriptionProviders(endpoint, providers);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  await initDb();
  const body = await request.json();
  const { endpoint } = body ?? {};

  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  await deleteSubscription(endpoint);
  return Response.json({ ok: true });
}
