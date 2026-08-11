'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { IconButton, Screen } from '@/components/Screen'
import { SummaryCard } from '@/components/SummaryCard'
import { formatWon, parseDateParts, splitHours } from '@/lib/format'
import { buildSeedMonth } from '@/lib/seed'

export default function HomePage() {
  const t = useTranslations('home')
  const tLog = useTranslations('worklog')
  const seed = useMemo(() => buildSeedMonth(), [])
  const recent = seed.logs.slice(0, 4)

  return (
    <Screen
      title={`${seed.monthLabel.year}년 ${seed.monthLabel.month}월`}
      action={
        <IconButton label="설정">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
          </svg>
        </IconButton>
      }
    >
      <SummaryCard
        netPay={seed.summary.netPay}
        grossPay={seed.summary.grossPay}
        deduction={seed.summary.deductionAmount}
      />

      {/* 미수금 0원이면 렌더하지 않는다. 빈 자리를 남기지 않고 레이아웃이 위로 붙는다 */}
      {seed.unpaidTotal > 0 && (
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-2.5 rounded-full bg-coral-light py-2 pl-4 pr-5 text-left text-[15px] font-medium text-coral-dark"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5m0 3h.01" />
          </svg>
          {t('unpaid')}
          <b className="tnum ml-auto text-[17px] font-semibold">{formatWon(seed.unpaidTotal)}</b>
        </button>
      )}

      {/* 주 CTA — 화면에서 유일한 검정 면. DESIGN-ILGIK button-primary */}
      <button
        type="button"
        className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t('cta')}
      </button>

      <p className="mb-[-4px] mt-1 text-[13px] font-semibold text-steel">{t('recent')}</p>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {recent.map((log) => {
          const d = parseDateParts(log.date)
          const { h, m } = splitHours(log.workedMinutes)
          return (
            <li
              key={log.id}
              className="flex min-h-[60px] items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-3.5 py-2.5"
            >
              <span
                className="h-3.5 w-3.5 flex-none rounded-xs border border-ink-deep/10"
                style={{ background: `var(--wp-${log.workplace.colorToken})` }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-medium leading-tight">
                  <span aria-hidden="true">{log.workplace.emoji}</span>
                  <span className="truncate">{log.workplace.name}</span>
                  {log.unpaid && (
                    <span className="flex-none rounded-full bg-coral-light px-2 py-[1px] text-xs font-semibold text-coral-dark">
                      {tLog('unpaidChip')}
                    </span>
                  )}
                </div>
                <div className="tnum text-[13px] text-steel">
                  {d.month}/{d.day} {d.weekday} · {h}시간{m > 0 ? ` ${m}분` : ''}
                </div>
              </div>
              <div className="tnum flex-none text-base font-semibold">{formatWon(log.grossPay)}</div>
            </li>
          )
        })}
      </ul>

      <p className="mt-2 text-center text-xs text-stone">
        Phase 0 · 화면의 모든 금액은 실제 급여 엔진이 계산한 데모 데이터입니다
      </p>
    </Screen>
  )
}
