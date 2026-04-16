'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import PushButton from './PushButton';

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'university', label: '숭실대학교' },
  { key: 'cse', label: '컴퓨터학부' },
  { key: 'student-council', label: '총학생회' },
] as const;

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';

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

      {/* Category filter */}
      <nav className="px-1 space-y-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeCategory === cat.key
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Push subscribe button */}
      <PushButton />
    </aside>
  );
}
