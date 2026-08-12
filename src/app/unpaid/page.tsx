'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Screen } from '@/components/Screen'
import { colorVar } from '@/lib/db/palette'
import { setPaymentStatus, todayISO } from '@/lib/db/repo'
import { getDB } from '@/lib/db/schema'
import type { WorkLog, Workplace } from '@/lib/db/schema'
import { useWorkplaces } from '@/lib/db/hooks'
import { formatWon, splitHours } from '@/lib/format'
import { useSnackbar } from '@/store/ui'

/**
 * 못 받은 돈.
 *
 * 이 앱이 다른 급여계산기와 갈라지는 유일한 화면이고,
 * 사용자가 남에게 소개할 이유가 여기서 나온다.
 *
 * 톤 규칙: "이건 불법이에요"라고 쓰지 않는다. "이만큼 못 받았어요"라는 사실만
 * 보여준다. 앱이 사용자를 사업주와의 갈등에 먼저 밀어넣지 않는다.
 */

interface Bucket {
  key: string
  workplace: Workplace | undefined
  yearMonth: string
  logs: WorkLog[]
  amount: number
  minutes: number
  /** 지급 예정일 (YYYY-MM-DD). 근무지에 지급일이 없으면 null */
  dueDate: string | null
  daysLate: number
}

/** 근무한 달의 다음 달 payDayOfMonth일이 지급 예정일이다 */
function dueDateFor(yearMonth: string, payDay: number | undefined): string | null {
  if (!payDay) return null
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y!, m!, Math.min(payDay, 28))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO).getTime()
  const b = new Date(toISO).getTime()
  return Math.floor((b - a) / (24 * 60 * 60 * 1000))
}

export default function UnpaidPage() {
  const workplaces = useWorkplaces(true)
  const showSnack = useSnackbar((s) => s.show)
  const [busy, setBusy] = useState<string | null>(null)
  const today = todayISO()

  const logs = useLiveQuery(
    async () => await getDB().workLogs.where('paymentStatus').notEqual('PAID').toArray(),
    [],
  )

  const buckets = useMemo<Bucket[]>(() => {
    if (!logs || !workplaces) return []
    const byId = new Map(workplaces.map((w) => [w.id, w]))
    const map = new Map<string, Bucket>()

    for (const log of logs) {
      const yearMonth = log.date.slice(0, 7)
      const key = `${log.workplaceId}|${yearMonth}`
      const wp = byId.get(log.workplaceId)
      const owed = log.grossPay - (log.paidAmount ?? 0)
      if (owed <= 0) continue

      const bucket = map.get(key)
      if (bucket) {
        bucket.logs.push(log)
        bucket.amount += owed
        bucket.minutes += log.workedMinutes
      } else {
        const dueDate = dueDateFor(yearMonth, wp?.payDayOfMonth)
        map.set(key, {
          key,
          workplace: wp,
          yearMonth,
          logs: [log],
          amount: owed,
          minutes: log.workedMinutes,
          dueDate,
          daysLate: dueDate && dueDate < today ? daysBetween(dueDate, today) : 0,
        })
      }
    }

    // 늦은 것이 먼저, 그다음 오래된 달 순
    return [...map.values()].sort(
      (a, b) => b.daysLate - a.daysLate || a.yearMonth.localeCompare(b.yearMonth),
    )
  }, [logs, workplaces, today])

  const total = buckets.reduce((s, b) => s + b.amount, 0)
  const loading = !logs || !workplaces

  async function markPaid(bucket: Bucket) {
    setBusy(bucket.key)
    try {
      const snapshot = bucket.logs.map((l) => ({ id: l.id, status: l.paymentStatus }))
      for (const log of bucket.logs) await setPaymentStatus(log.id, 'PAID')
      showSnack(`${formatWon(bucket.amount)}원 받았다고 표시했어요`, () => {
        // 되돌리기 — 원래 상태로 돌린다
        void Promise.all(snapshot.map((s) => setPaymentStatus(s.id, s.status)))
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Screen title="못 받은 돈">
      {loading ? (
        <div className="h-28 animate-pulse rounded-xxxl bg-canvas" />
      ) : total === 0 ? (
        /* 빈 화면을 두지 않는다 */
        <section className="rounded-xxxl bg-teal-light px-5 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            ✅
          </span>
          <p className="m-0 mt-3 text-lg font-medium text-moss-dark">다 받았어요</p>
          <p className="m-0 mt-1.5 text-sm text-moss-dark opacity-80">
            못 받은 돈이 없어요. 계속 기록해 두세요.
          </p>
        </section>
      ) : (
        <>
          {/* 이 앱에서 유일하게 coral을 지면으로 크게 쓰는 자리다 */}
          <section className="rounded-xxxl bg-coral-light p-5">
            <div className="text-sm font-medium text-coral-dark">아직 못 받은 돈</div>
            <div className="tnum mt-0.5 text-[48px] font-medium leading-[1.1] tracking-[-1.5px] text-coral-dark">
              {formatWon(total)}
              <span className="text-[22px] tracking-normal">원</span>
            </div>
          </section>

          {buckets.map((b) => {
            const { h } = splitHours(b.minutes)
            const [y, m] = b.yearMonth.split('-').map(Number)
            return (
              <section
                key={b.key}
                className="rounded-xl border border-hairline-soft bg-canvas p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 flex-none rounded-xs border border-ink-deep/10"
                    style={{ background: colorVar(b.workplace?.colorToken ?? 1) }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-base font-medium">
                    <span aria-hidden="true">{b.workplace?.emoji} </span>
                    {b.workplace?.name ?? '보관된 근무지'}
                  </span>
                  <span className="tnum flex-none text-lg font-semibold">
                    {formatWon(b.amount)}
                  </span>
                </div>

                <div className="tnum mt-1 text-[13px] text-steel">
                  {y}년 {m}월 · {b.logs.length}일 · {h}시간
                </div>

                {b.dueDate ? (
                  <span
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${
                      b.daysLate > 0
                        ? 'bg-coral-light text-coral-dark'
                        : 'bg-surface text-slate'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {b.daysLate > 0
                      ? `받기로 한 날에서 ${b.daysLate}일 지났어요`
                      : `${Number(b.dueDate.slice(5, 7))}월 ${Number(b.dueDate.slice(8, 10))}일에 받기로 했어요`}
                  </span>
                ) : (
                  <span className="mt-2.5 inline-flex rounded-full bg-surface px-2.5 py-1 text-[13px] font-medium text-slate">
                    받는 날을 정해두면 알려드려요
                  </span>
                )}

                <button
                  type="button"
                  disabled={busy === b.key}
                  onClick={() => void markPaid(b)}
                  className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-success bg-canvas text-base font-medium text-success disabled:opacity-50"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  받았어요
                </button>
              </section>
            )
          })}

          <Link
            href="/support"
            className="flex min-h-[72px] w-full items-center gap-3.5 rounded-xxxl bg-primary px-5 text-on-primary"
          >
            <span className="text-2xl" aria-hidden="true">
              📄
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">돈을 못 받았을 때</span>
              <span className="block text-[13px] text-muted">신고하는 방법을 알려드려요</span>
            </span>
            <svg className="flex-none" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </>
      )}
    </Screen>
  )
}
