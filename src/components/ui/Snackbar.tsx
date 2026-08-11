'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { UNDO_TIMEOUT_MS, useLogSheet, useSnackbar, useWorkplaceSheet } from '@/store/ui'

export function Snackbar() {
  const t = useTranslations('common')
  const { message, undo, dismiss } = useSnackbar()
  // 시트가 열려 있으면 아래에 두면 푸터의 저장 버튼과 내역을 가린다.
  // ⚠️ 두 훅을 ||로 묶지 않는다 — 단락 평가로 훅 호출 수가 달라져 React가 죽는다.
  const logSheetOpen = useLogSheet((s) => s.open)
  const workplaceSheetOpen = useWorkplaceSheet((s) => s.open)
  const sheetOpen = logSheetOpen || workplaceSheetOpen

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(dismiss, UNDO_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [message, dismiss])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${
        sheetOpen ? 'top-0 pt-3' : 'bottom-0 pb-20'
      }`}
      style={sheetOpen ? { paddingTop: 'max(0.75rem, env(safe-area-inset-top))' } : { paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto flex min-h-14 w-full max-w-[398px] items-center gap-3 rounded-full bg-primary py-2 pl-5 pr-2 text-sm text-on-primary shadow-[0_16px_48px_-8px_rgba(5,0,56,0.32)]">
        <span className="min-w-0 flex-1">{message}</span>
        {undo && (
          <button
            type="button"
            onClick={() => {
              undo()
              dismiss()
            }}
            className="flex-none rounded-full bg-canvas px-4 py-2 text-sm font-medium text-primary"
          >
            {t('undo')}
          </button>
        )}
      </div>
    </div>
  )
}
