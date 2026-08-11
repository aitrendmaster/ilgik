'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * 바텀시트 — DESIGN-ILGIK rounded.feature(32px) + elevation 4.
 * 앱에서 그림자를 쓰는 컴포넌트는 스티키 노트와 이 시트뿐이다.
 */
export function BottomSheet({
  open,
  onClose,
  header,
  footer,
  children,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  labelledBy?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="flex-1 bg-ink-deep/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-[32px] bg-canvas shadow-[0_16px_48px_-8px_rgba(5,0,56,0.32)] outline-none"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 flex-none rounded-full bg-hairline-strong" />
        {header && (
          <div className="flex-none border-b border-hairline-soft px-5 pb-3.5 pt-1.5">{header}</div>
        )}
        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex-none border-t border-hairline-soft px-5 pb-5 pt-3.5"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/** 스텝 인디케이터 — 숫자가 아니라 막대다. "1/3"도 못 읽는 사용자가 있다 */
export function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="flex flex-none gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block h-1 w-6 rounded-full ${i < step ? 'bg-primary' : 'bg-hairline'}`}
        />
      ))}
    </div>
  )
}
