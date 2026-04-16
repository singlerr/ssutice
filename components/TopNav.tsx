'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import MobileMenu from './MobileMenu';

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [searchText, setSearchText] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync search text when URL changes externally (e.g. browser back)
  useEffect(() => {
    setSearchText(searchParams.get('q') ?? '');
  }, [searchParams]);

  const submitSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }
      params.delete('page');
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchText(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => submitSearch(value), 300);
    },
    [submitSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        submitSearch(searchText);
      }
    },
    [submitSearch, searchText]
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4 md:px-6 gap-4 md:gap-8">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 -ml-1"
          onClick={() => setMenuOpen(true)}
          aria-label="메뉴 열기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 flex-shrink-0">
          <span className="text-blue-700 font-bold text-lg tracking-tight">SSU</span>
          <span className="text-gray-800 font-semibold text-lg tracking-tight">Today</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-900 border-b-2 border-blue-700 pb-0.5">
            Notices
          </Link>
          <span className="text-gray-400 cursor-not-allowed">Schedule</span>
          <span className="text-gray-400 cursor-not-allowed">Archive</span>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-blue-300 focus-within:bg-white transition-all">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="공지사항 검색..."
              className="bg-transparent outline-none text-gray-800 placeholder-gray-400 w-40 lg:w-56"
            />
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <Suspense>
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </Suspense>
    </>
  );
}
