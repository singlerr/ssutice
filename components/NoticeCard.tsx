import { Notice } from '@/lib/db';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  university: { label: '숭실대', color: 'bg-blue-600 text-white' },
  cse: { label: '컴퓨터학부', color: 'bg-blue-900 text-white' },
  'student-council': { label: '총학생회', color: 'bg-green-800 text-white' },
};

function formatDate(dateStr: string | null, createdAt: string) {
  const src = dateStr || createdAt;
  if (!src) return '';
  // Try to extract date pattern YYYY.MM.DD or YYYY-MM-DD
  const m = src.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
  if (m) return `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}`;
  return src.slice(0, 10);
}

export default function NoticeCard({ notice }: { notice: Notice }) {
  const meta = PROVIDER_META[notice.provider] ?? { label: notice.provider, color: 'bg-gray-500 text-white' };
  const dateStr = formatDate(notice.date, notice.created_at);

  return (
    <a
      href={notice.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg group transition-colors"
    >
      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${meta.color}`}>
        {meta.label}
      </span>
      <span className="flex-1 text-sm text-gray-800 line-clamp-1 group-hover:text-blue-700">
        {notice.title}
      </span>
      <span className="flex-shrink-0 text-xs text-gray-400 hidden sm:block">{dateStr}</span>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}
