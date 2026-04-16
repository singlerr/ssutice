import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'SSU 공지사항',
  description: '숭실대학교 공지사항 통합 알리미 — 컴퓨터학부, 총학생회, 대학 공지 한눈에 보기',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1D4ED8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1D4ED8" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
