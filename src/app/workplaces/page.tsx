'use client'

import { useState } from 'react'
import { Screen } from '@/components/Screen'
import { StickyCard } from '@/components/worklog/LogSheet'
import { useWorkplaces } from '@/lib/db/hooks'
import { archiveWorkplace } from '@/lib/db/repo'
import { formatRate, formatWon } from '@/lib/format'
import { insuranceRateFor } from '@/lib/payroll'
import { todayISO } from '@/lib/db/repo'
import { useSnackbar, useWorkplaceSheet } from '@/store/ui'
import type { Workplace } from '@/lib/db/schema'

const DEDUCTION_LABEL: Record<string, string> = {
  RATE_3_3: '3.3% 떼는 곳',
  DAILY_WORKER: '일용직 신고',
  INSURANCE_4: '4대보험',
  NONE: '전액 받는 곳',
}

function deductionSummary(w: Workplace): string {
  if (w.deductionType === 'INSURANCE_4' && w.insuranceFlags) {
    return `4대보험 ${formatRate(insuranceRateFor(w.insuranceFlags, todayISO()))}`
  }
  return DEDUCTION_LABEL[w.deductionType] ?? ''
}

export default function WorkplacesPage() {
  const openNew = useWorkplaceSheet((s) => s.openNew)
  const openEdit = useWorkplaceSheet((s) => s.openEdit)
  const showSnack = useSnackbar((s) => s.show)
  const [showArchived, setShowArchived] = useState(false)

  const all = useWorkplaces(true)
  const active = all?.filter((w) => !w.isArchived) ?? []
  const archived = all?.filter((w) => w.isArchived) ?? []

  return (
    <Screen title="일하는 곳">
      {!all ? (
        <div className="h-28 animate-pulse rounded-xxl bg-canvas" />
      ) : active.length === 0 ? (
        <section className="rounded-xxxl border border-hairline-soft bg-canvas px-5 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            🏭
          </span>
          <p className="m-0 mt-3 text-lg font-medium">아직 만든 곳이 없어요</p>
          <p className="m-0 mt-1.5 text-sm text-steel">
            색과 그림은 알아서 정해드려요. 이름만 넣으면 돼요.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {active.map((w) => (
            <StickyCard key={w.id} workplace={w} onClick={() => openEdit(w.id)} />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {active.map((w) => (
            <li
              key={w.id}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-3.5 py-2"
            >
              <span aria-hidden="true">{w.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.name}</span>
              <span className="tnum flex-none text-[13px] text-steel">
                {formatWon(w.defaultHourlyWage)}원 · {deductionSummary(w)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => openNew(false)}
        className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        새로 만들기
      </button>

      {/* 삭제는 없다. 보관된 곳은 목록에서만 숨고 지난 기록은 그대로 남는다 */}
      {archived.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="mt-1 flex h-12 items-center justify-center gap-1.5 self-center text-sm font-medium text-steel"
          >
            보관한 곳 {archived.length}개 {showArchived ? '숨기기' : '보기'}
          </button>
          {showArchived && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {archived.map((w) => (
                <li
                  key={w.id}
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-hairline-soft bg-surface px-3.5 py-2"
                >
                  <span className="opacity-50" aria-hidden="true">
                    {w.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-steel">
                    {w.name}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await archiveWorkplace(w.id, false)
                      showSnack('다시 꺼냈어요')
                    }}
                    className="flex-none rounded-full border border-hairline-strong px-3.5 py-2 text-[13px] font-medium"
                  >
                    다시 쓰기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-1 text-center text-xs leading-relaxed text-stone">
        시급이나 공제 방식을 바꿔도 지난 기록의 금액은 바뀌지 않아요
      </p>
    </Screen>
  )
}
