import { Suspense } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import NoticeList from '@/components/NoticeList';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <TopNav />
      </Suspense>
      <div className="flex pt-14">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-60 flex-shrink-0 fixed top-14 bottom-0 left-0 border-r border-gray-200 bg-white px-4 overflow-y-auto">
          <Suspense>
            <Sidebar />
          </Suspense>
        </div>

        {/* Main content */}
        <main className="flex-1 md:ml-60 p-6 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Notices</h1>
          <p className="text-sm text-gray-500 mb-6">
            Academic and campus updates curated for your department.
          </p>
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              불러오는 중...
            </div>
          }>
            <NoticeList />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
