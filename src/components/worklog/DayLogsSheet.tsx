'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { colorVar } from '@/lib/db/palette'
import { deleteLog, restoreLog, todayISO } from '@/lib/db/repo'
import { getDB } from '@/lib/db/schema'
import { useWorkplaces } from '@/lib/db/hooks'
import { formatWon, parseDateParts, splitHours } from '@/lib/format'
import { useLogSheet, useSnackbar } from '@/store/ui'

/**
 * 달력에서 날짜를 눌렀을 때 나오는 그날 기록 목록.
 * 탭하면 고치고, 지우면 5초 안에 되돌릴 수 있다 —
 * 잘못 눌러 기록이 사라지면 그게 곧 증거 소실이다.
 */
export function DayLogsSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const workplaces = useWorkplaces(true)
  const openLog = useLogSheet((s) => s.openSheet)
  const showSnack = useSnackbar((s) => s.show)

  // async로 감싼다 — Dexie의 PromiseExtended는 useLiveQuery의 시그니처와 바로 맞지 않는다
  const logs = useLiveQuery(
    async () => (date ? await getDB().workLogs.where('date').equals(date).toArray() : undefined),
    [date],
  )

  if (!date) return null
  const d = parseDateParts(date)
  const byId = new Map((workplaces ?? []).map((w) => [w.id, w]))
  const total = (logs ?? []).reduce((s, l) => s + l.grossPay, 0)

  return (
    <BottomSheet
      open={Boolean(date)}
      onClose={onClose}
      labelledBy="day-logs-title"
      header={
        <div className="flex items-baseline justify-between gap-3 pt-1.5">
          <h2 id="day-logs-title" className="text-xl font-medium tracking-[-0.3px]">
            {d.month}월 {d.day}일 ({d.weekday})
          </h2>
          {total > 0 && (
            <span className="tnum text-lg font-semibold">{formatWon(total)}원</span>
          )}
        </div>
      }
      footer={
        date <= todayISO() ? (
          <button
            type="button"
            onClick={() => {
              onClose()
              openLog(date)
            }}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            이 날 더 적기
          </button>
        ) : null
      }
    >
      {(logs ?? []).map((log) => {
        const wp = byId.get(log.workplaceId)
        const { h, m } = splitHours(log.workedMinutes)
        return (
          <div
            key={log.id}
            className="flex items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-3.5 py-2.5"
          >
            <button
              type="button"
              onClick={() => {
                onClose()
                openLog(log.date, log)
              }}
              className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 text-left"
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
                  {log.isHoliday && (
                    <span className="flex-none rounded-full bg-coral-light px-2 py-[1px] text-xs font-semibold text-coral-dark">
                      특근
                    </span>
                  )}
                </span>
                <span className="tnum block text-[13px] text-steel">
                  {h}시간{m > 0 ? ` ${m}분` : ''}
                  {log.revisionCount > 0 ? ` · ${log.revisionCount}번 고침` : ''}
                </span>
              </span>
              <span className="tnum flex-none text-base font-semibold">
                {formatWon(log.grossPay)}
              </span>
            </button>

            <button
              type="button"
              aria-label="지우기"
              onClick={async () => {
                const removed = await deleteLog(log.id)
                if (!removed) return
                showSnack('지웠어요', () => {
                  void restoreLog(removed)
                })
              }}
              className="grid h-11 w-11 flex-none place-items-center rounded-full text-stone"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        )
      })}

      {logs && logs.length === 0 && (
        <p className="m-0 py-6 text-center text-sm text-steel">이 날은 적은 게 없어요.</p>
      )}
    </BottomSheet>
  )
}
