import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AppProviders } from '@/components/AppProviders'
import { AppShell } from '@/components/AppShell'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import './globals.css'

export const metadata: Metadata = {
  title: '일당노트 · Ilddang Note',
  description:
    '외국인 근로자를 위한 다국어 근무기록·급여계산 앱. 오늘 어디서 몇 시간 일했는지만 누르면 이번 달 받을 돈이 나옵니다.',
  applicationName: '일당노트',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '일당노트',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 저시력 사용자를 위해 확대를 막지 않는다
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#ffd02f',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
