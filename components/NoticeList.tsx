'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Notice } from '@/lib/db';
import NoticeCard from './NoticeCard';
import HighlightCard from './HighlightCard';

const LIMIT = 50; // show up to 50 per fetch

export default function NoticeList() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotices = useCallback(
    async (p: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
        if (query) params.set('q', query);
        const res = await fetch(`/api/notices?${params.toString()}`);
        const data = await res.json();
        if (replace) {
          setNotices(data.notices ?? []);
        } else {
          setNotices((prev) => [...prev, ...(data.notices ?? [])]);
        }
        setTotal(data.total ?? 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    setPage(1);
    fetchNotices(1, true);
  }, [query, fetchNotices]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchNotices(next, false);
  }

  const hasMore = notices.length < total;
  const highlight = notices[0];
  const rest = notices.slice(1);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          불러오는 중...
        </div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm gap-2">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {query ? `"${query}" 검색 결과가 없습니다` : '공지사항이 없습니다'}
        </div>
      ) : (
        <>
          {highlight && <HighlightCard notice={highlight} />}

          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {rest.map((notice) => (
              <div key={notice.id} className="px-3">
                <NoticeCard notice={notice} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 px-1 text-xs text-gray-400">
            <span>{notices.length}개 표시 중 (전체 {total}개)</span>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-1 px-4 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {loadingMore ? '불러오는 중...' : '더 보기'}
                {!loadingMore && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
