'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import PushButton from './PushButton';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '⊞' },
  { key: 'university', label: '숭실대학교', icon: '🏫' },
  { key: 'cse', label: '컴퓨터학부', icon: '💻' },
  { key: 'student-council', label: '총학생회', icon: '👥' },
];

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('category') ?? 'all';
  const drawerRef = useRef<HTMLDivElement>(null);

  function setCategory(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', key);
    params.delete('page');
    router.push(`/?${params.toString()}`);
    onClose();
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-label="메뉴 닫기"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
          <p className="text-blue-700 font-bold text-base">SSU Today</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="메뉴 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category filters */}
        <nav className="flex flex-col gap-0.5 p-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active === cat.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Push subscribe */}
        <div className="p-3 border-t border-gray-100">
          <PushButton />
        </div>
      </div>
    </div>
  );
}
