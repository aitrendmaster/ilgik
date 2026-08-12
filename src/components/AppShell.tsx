'use client'

import { useEffect, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { LocaleFont } from './LocaleFont'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { Snackbar } from './ui/Snackbar'
import { LogSheet } from './worklog/LogSheet'
import { WorkplaceSheet } from './workplace/WorkplaceSheet'
import { ensureSettings } from '@/lib/db/repo'
import { flushInquiries } from '@/lib/support'

/**
 * 시트와 스낵바는 한 번만 마운트한다.
 * 기록 입력은 홈·달력 어디서든 열려야 해서 화면이 아니라 셸에 붙인다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  // 설정 행 생성은 liveQuery 밖에서 한 번만 한다.
  // 읽기 경로(readSettings)에서 쓰면 Dexie가 ReadOnlyError로 막는다.
  useEffect(() => {
    void ensureSettings().catch(() => {
      // 설정이 없어도 기본값으로 동작한다. 앱 사용을 막지 않는다.
    })
  }, [])

  // 백엔드가 열리면 적어두었던 문의를 올린다. 실패해도 UI를 막지 않는다
  useEffect(() => {
    void flushInquiries().catch(() => {})
  }, [])

  return (
    <ErrorBoundary>
      <LocaleFont />
      <ServiceWorkerRegistrar />
      {children}
      <LogSheet />
      <WorkplaceSheet />
      <Snackbar />
    </ErrorBoundary>
  )
}
