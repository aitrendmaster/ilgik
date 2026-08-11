'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { UNDO_TIMEOUT_MS, useSnackbar } from '@/store/ui'

export function Snackbar() {
  const t = useTranslations('common')
  const { message, undo, dismiss } = useSnackbar()

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-20"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
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
