import webpush from 'web-push';
import { getSubscriptionsByProvider, deleteSubscription } from './db';

let _initialized = false;

function initPush() {
  if (_initialized) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  _initialized = true;
}

export async function sendToProvider(provider: string, title: string, body: string, url: string) {
  initPush();
  const subscriptions = await getSubscriptionsByProvider(provider);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, url }),
          { TTL: 86400 }
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await deleteSubscription(sub.endpoint).catch(() => {});
        }
      }
    })
  );
}
