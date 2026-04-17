import { initDb, getSubscriptionProviders } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const providers = await getSubscriptionProviders(endpoint);
  return Response.json({ providers });
}
