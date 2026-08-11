'use client'

import type { ReactNode } from 'react'
import { TabBar } from './TabBar'

/**
 * 모바일 셸. 데스크톱에서도 폭을 제한해 휴대폰 레이아웃을 유지한다.
 * 이 앱은 현장에서 한 손으로 쓰는 것을 전제로 설계됐다.
 */
export function Screen({
  title,
  action,
  children,
  showTabs = true,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  showTabs?: boolean
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface">
      <header
        className="flex flex-none items-center justify-between gap-2 px-4 pb-3 pt-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <h1 className="pl-1 text-[22px] font-medium leading-tight tracking-[-0.3px]">{title}</h1>
        {action}
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 pb-4">{children}</main>

      {showTabs && <TabBar />}
    </div>
  )
}

/** 아이콘 전용 원형 버튼 — DESIGN-ILGIK button-icon-circular (모바일 44px 이상) */
export function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-11 flex-none place-items-center rounded-full border border-hairline bg-canvas text-ink"
    >
      {children}
    </button>
  )
}
