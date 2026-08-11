'use client'

import { useTranslations } from 'next-intl'
import { IconButton, Screen } from '@/components/Screen'
import { SummaryCard } from '@/components/SummaryCard'
import { useMonthView, useWorkplaces } from '@/lib/db/hooks'
import { colorVar } from '@/lib/db/palette'
import { monthOf, todayISO } from '@/lib/db/repo'
import { formatWon, parseDateParts, splitHours } from '@/lib/format'
import { useLogSheet, useWorkplaceSheet } from '@/store/ui'

export default function HomePage() {
  const t = useTranslations('home')
  const tLog = useTranslations('worklog')
  const today = todayISO()
  const month = monthOf(today)

  const workplaces = useWorkplaces()
  const view = useMonthView(month)
  const openLog = useLogSheet((s) => s.openSheet)
  const openPastLog = useLogSheet((s) => s.openForPastDate)
  const openWorkplace = useWorkplaceSheet((s) => s.openNew)

  const [year, m] = month.split('-').map(Number)
  const loading = !workplaces || !view
  const hasWorkplace = (workplaces?.length ?? 0) > 0
  const recent = view?.logs.slice(0, 5) ?? []

  return (
    <Screen
      title={`${year}년 ${m}월`}
      action={
        <IconButton label="설정">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
          </svg>
        </IconButton>
      }
    >
      {loading ? (
        <div className="h-[168px] animate-pulse rounded-xxxl border border-hairline-soft bg-canvas" />
      ) : !hasWorkplace ? (
        /* 기록이 없으면 빈 화면 대신 첫 근무지를 만들도록 안내한다 */
        <section className="rounded-xxxl border border-hairline-soft bg-canvas px-5 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            🏭
          </span>
          <p className="m-0 mt-3 text-lg font-medium">{t('emptyWorkplace')}</p>
          <p className="m-0 mt-1.5 text-sm text-steel">
            한 번 만들어두면 다음부터는 세 번만 눌러요
          </p>
        </section>
      ) : (
        <SummaryCard
          netPay={view.summary.netPay}
          grossPay={view.summary.grossPay}
          deduction={view.summary.deductionAmount}
        />
      )}

      {/* 미수금 0원이면 렌더하지 않는다. 빈 자리를 남기지 않는다 */}
      {!loading && view.unpaidTotal > 0 && (
        <div className="flex min-h-14 w-full items-center gap-2.5 rounded-full bg-coral-light py-2 pl-4 pr-5 text-[15px] font-medium text-coral-dark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5m0 3h.01" />
          </svg>
          {t('unpaid')}
          <b className="tnum ml-auto text-[17px] font-semibold">{formatWon(view.unpaidTotal)}</b>
        </div>
      )}

      {/* 주 CTA — 화면에서 유일한 검정 면 */}
      <button
        type="button"
        onClick={() => (hasWorkplace ? openLog(today) : openWorkplace(true))}
        className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {hasWorkplace ? t('cta') : t('emptyWorkplaceCta')}
      </button>

      {/* 놓친 날을 나중에 적을 수 있어야 한다 — 인력사무소 일용직은 며칠씩 밀린다 */}
      {hasWorkplace && (
        <button
          type="button"
          onClick={() => openPastLog(today)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline-strong bg-canvas text-base font-medium text-ink"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          지난 날 적기
        </button>
      )}

      {view && recent.length > 0 && (
        <>
          <p className="mb-[-4px] mt-1 text-[13px] font-semibold text-steel">{t('recent')}</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {recent.map((log) => {
              const wp = view.workplaces.get(log.workplaceId)
              const d = parseDateParts(log.date)
              const { h, m: mm } = splitHours(log.workedMinutes)
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => openLog(log.date, log)}
                    className="flex min-h-[60px] w-full items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-3.5 py-2.5 text-left"
                  >
                    <span
                      className="h-3.5 w-3.5 flex-none rounded-xs border border-ink-deep/10"
                      style={{ background: colorVar(wp?.colorToken ?? 1) }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[15px] font-medium leading-tight">
                        <span aria-hidden="true">{wp?.emoji}</span>
                        <span className="truncate">{wp?.name ?? '보관된 근무지'}</span>
                        {log.paymentStatus !== 'PAID' && (
                          <span className="flex-none rounded-full bg-coral-light px-2 py-[1px] text-xs font-semibold text-coral-dark">
                            {tLog('unpaidChip')}
                          </span>
                        )}
                      </span>
                      <span className="tnum block text-[13px] text-steel">
                        {d.month}/{d.day} {d.weekday} · {h}시간{mm > 0 ? ` ${mm}분` : ''}
                        {log.isHoliday ? ' · 특근' : ''}
                      </span>
                    </span>
                    <span className="tnum flex-none text-base font-semibold">
                      {formatWon(log.grossPay)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {!loading && hasWorkplace && recent.length === 0 && (
        <p className="mt-2 text-center text-sm text-steel">{t('emptyLog')}</p>
      )}
    </Screen>
  )
}
