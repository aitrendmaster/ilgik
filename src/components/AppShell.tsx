'use client'

import type { ReactNode } from 'react'
import { LocaleFont } from './LocaleFont'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { Snackbar } from './ui/Snackbar'
import { LogSheet } from './worklog/LogSheet'
import { WorkplaceSheet } from './workplace/WorkplaceSheet'

/**
 * 시트와 스낵바는 한 번만 마운트한다.
 * 기록 입력은 홈·달력 어디서든 열려야 해서 화면이 아니라 셸에 붙인다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <LocaleFont />
      <ServiceWorkerRegistrar />
      {children}
      <LogSheet />
      <WorkplaceSheet />
      <Snackbar />
    </>
  )
}
