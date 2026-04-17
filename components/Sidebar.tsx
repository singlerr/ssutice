'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'university', label: '숭실대학교' },
  { key: 'cse', label: '컴퓨터학부' },
  { key: 'student-council', label: '총학생회' },
  { key: 'sw', label: '소프트웨어학부' },
  { key: 'ig-focussu', label: '총학생회 인스타' },
  { key: 'ig-it', label: 'IT대학 학생회' },
  { key: 'ig-cse-council', label: '컴퓨터학부 학생회' },
] as const;

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';

  const [pushSupported, setPushSupported] = useState(false);
  const [denied, setDenied] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [subscribedProviders, setSubscribedProviders] = useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPushSupported(true);
    if (Notification.permission === 'denied') setDenied(true);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setCurrentEndpoint(sub.endpoint);
        try {
          const res = await fetch(`/api/push/preferences?endpoint=${encodeURIComponent(sub.endpoint)}`);
          const data = await res.json();
          setSubscribedProviders(data.providers ?? ['all']);
        } catch {
          setSubscribedProviders(['all']);
        }
      }
    });
  }, []);

  function isBellOn(key: string): boolean {
    if (!currentEndpoint) return false;
    return subscribedProviders.includes('all') || subscribedProviders.includes(key);
  }

  function setKeyLoading(key: string, on: boolean) {
    setLoadingKeys((prev) => {
      const s = new Set(prev);
      on ? s.add(key) : s.delete(key);
      return s;
    });
  }

  async function toggleBell(key: string) {
    if (!pushSupported || denied) return;
    setKeyLoading(key, true);

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        if (Notification.permission === 'denied') { setDenied(true); return; }
        const { publicKey } = await fetch('/api/push/vapid-key').then((r) => r.json());
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, providers: [key] }),
        });
        setCurrentEndpoint(sub.endpoint);
        setSubscribedProviders([key]);
      } else {
        let newProviders: string[];
        if (subscribedProviders.includes('all')) {
          // Expand "all" to explicit list, then remove this key
          const allKeys = CATEGORIES.filter((c) => c.key !== 'all').map((c) => c.key);
          newProviders = allKeys.filter((k) => k !== key);
        } else if (subscribedProviders.includes(key)) {
          newProviders = subscribedProviders.filter((p) => p !== key);
        } else {
          newProviders = [...subscribedProviders, key];
        }

        if (newProviders.length === 0) {
          await sub.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          setCurrentEndpoint(null);
          setSubscribedProviders([]);
        } else {
          await fetch('/api/push/subscribe', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint, providers: newProviders }),
          });
          setSubscribedProviders(newProviders);
        }
      }
    } catch (err) {
      console.error('push toggle error:', err);
      if (Notification.permission === 'denied') setDenied(true);
    } finally {
      setKeyLoading(key, false);
    }
  }

  function setCategory(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'all') {
      params.delete('category');
    } else {
      params.set('category', key);
    }
    params.delete('page');
    router.push(`/?${params.toString()}`);
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col pt-6 pb-4 pr-4">
      {/* Brand */}
      <div className="mb-6 px-2">
        <p className="text-blue-700 font-bold text-base">SSU Today</p>
        <p className="text-gray-400 text-xs uppercase tracking-widest mt-0.5">Academic Curator</p>
      </div>

      {/* Category filter with per-provider bell toggles */}
      <nav className="px-1 space-y-0.5">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const showBell = pushSupported && !denied && cat.key !== 'all';
          const bellOn = isBellOn(cat.key);
          const bellLoading = loadingKeys.has(cat.key);

          return (
            <div key={cat.key} className="flex items-center gap-1">
              <button
                onClick={() => setCategory(cat.key)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {cat.label}
              </button>
              {showBell && (
                <button
                  onClick={() => toggleBell(cat.key)}
                  disabled={bellLoading}
                  title={bellOn ? '알림 끄기' : '알림 켜기'}
                  className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                    bellOn
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {bellLoading ? (
                    <svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : bellOn ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      {denied && (
        <p className="px-3 text-xs text-gray-400">브라우저에서 알림이 차단됨</p>
      )}
    </aside>
  );
}
