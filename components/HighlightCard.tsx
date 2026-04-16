import { Notice } from '@/lib/db';

export default function HighlightCard({ notice }: { notice: Notice }) {
  return (
    <a
      href={notice.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-l-4 border-blue-700 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow mb-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Important Highlight
          </p>
          <p className="text-sm font-medium text-gray-900 leading-relaxed">
            {notice.title}
          </p>
        </div>
        <div className="flex-shrink-0 text-center">
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {new Date().getMonth() + 1}/{new Date().getDate()}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Deadline</p>
        </div>
      </div>
    </a>
  );
}
