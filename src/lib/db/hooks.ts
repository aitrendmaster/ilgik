'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { calculateMonthlyPay, type MonthlyPayResult } from '@/lib/payroll'
import { getDB, type AppSettings, type WorkLog, type Workplace } from './schema'
import { listLogsInMonth, listWorkplaces, monthOf, readSettings } from './repo'

/**
 * 정적 export라 첫 렌더는 서버에서 일어난다. IndexedDB는 브라우저에만 있으므로
 * 마운트 전에는 쿼리를 실행하지 않는다.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export function useWorkplaces(includeArchived = false): Workplace[] | undefined {
  const mounted = useMounted()
  return useLiveQuery(
    () => (mounted ? listWorkplaces(includeArchived) : undefined),
    [mounted, includeArchived],
  )
}

export function useWorkplace(id: string | null): Workplace | undefined {
  const mounted = useMounted()
  return useLiveQuery(
    () => (mounted && id ? getDB().workplaces.get(id) : undefined),
    [mounted, id],
  )
}

export function useSettings(): AppSettings | undefined {
  const mounted = useMounted()
  return useLiveQuery(() => (mounted ? readSettings() : undefined), [mounted])
}

export function useMonthLogs(yearMonth: string): WorkLog[] | undefined {
  const mounted = useMounted()
  return useLiveQuery(
    () => (mounted ? listLogsInMonth(yearMonth) : undefined),
    [mounted, yearMonth],
  )
}

export interface MonthView {
  logs: WorkLog[]
  workplaces: Map<string, Workplace>
  summary: MonthlyPayResult
  unpaidTotal: number
}

/**
 * 월 정산. 공제는 기록 시점 스냅샷으로 계산한다.
 * 근무지 설정을 나중에 바꿔도 과거 달의 금액은 변하지 않는다.
 */
export function useMonthView(yearMonth: string): MonthView | undefined {
  const logs = useMonthLogs(yearMonth)
  const workplaces = useWorkplaces(true)

  if (!logs || !workplaces) return undefined

  const byId = new Map(workplaces.map((w) => [w.id, w]))

  const grouped = new Map<string, WorkLog[]>()
  for (const log of logs) {
    const list = grouped.get(log.workplaceId)
    if (list) list.push(log)
    else grouped.set(log.workplaceId, [log])
  }

  const summary = calculateMonthlyPay(
    [...grouped.entries()].map(([workplaceId, group]) => ({
      workplaceId,
      // 근무지 현재 설정이 아니라 기록 시점 스냅샷을 쓴다
      deductionType: group[0]!.deductionSnapshot,
      insuranceFlags: group[0]!.insuranceFlagsSnapshot,
      otherDeductions: group[0]!.otherDeductionsSnapshot ?? [],
      days: group.map((l) => ({ grossPay: l.grossPay, workedMinutes: l.workedMinutes })),
    })),
    `${yearMonth}-01`,
  )

  const unpaidTotal = logs
    .filter((l) => l.paymentStatus !== 'PAID')
    .reduce((sum, l) => sum + l.grossPay - (l.paidAmount ?? 0), 0)

  return { logs, workplaces: byId, summary, unpaidTotal }
}

export { monthOf }
