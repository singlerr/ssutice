'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushButton() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js').catch(console.error);

    // Check current subscription status
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus('subscribed');
      else if (Notification.permission === 'denied') setStatus('denied');
    });
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const { publicKey } = await fetch('/api/push/vapid-key').then((r) => r.json());
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
      setStatus('subscribed');
    } catch (err) {
      console.error('Push subscribe failed:', err);
      if (Notification.permission === 'denied') setStatus('denied');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'unsupported') return null;

  return (
    <button
      onClick={status === 'subscribed' ? unsubscribe : subscribe}
      disabled={loading || status === 'denied'}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        status === 'subscribed'
          ? 'bg-green-50 text-green-700 hover:bg-green-100'
          : status === 'denied'
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {loading
        ? '처리 중...'
        : status === 'subscribed'
        ? '알림 구독 중'
        : status === 'denied'
        ? '알림 차단됨'
        : '알림 구독하기'}
    </button>
  );
}
