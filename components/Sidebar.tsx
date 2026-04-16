'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import PushButton from './PushButton';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '⊞' },
  { key: 'university', label: '숭실대학교', icon: '🏫' },
  { key: 'cse', label: '컴퓨터학부', icon: '💻' },
  { key: 'student-council', label: '총학생회', icon: '👥' },
];

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('category') ?? 'all';

  function setCategory(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', key);
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

      {/* Category filters */}
      <nav className="flex flex-col gap-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
              active === cat.key
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-base">{cat.icon}</span>
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
