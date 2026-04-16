export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return Response.json({ error: 'VAPID not configured' }, { status: 500 });
  }
  return Response.json({ publicKey });
}
