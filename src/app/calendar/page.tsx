'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconButton, Screen } from '@/components/Screen'
import { DayLogsSheet } from '@/components/worklog/DayLogsSheet'
import { useMonthView } from '@/lib/db/hooks'
import { colorVar } from '@/lib/db/palette'
import { monthOf, todayISO } from '@/lib/db/repo'
import { formatHoursShort, formatWon, splitHours } from '@/lib/format'
import { useGuestStatus } from '@/lib/guest'
import { useSession } from 'next-auth/react'
import { useLogSheet } from '@/store/ui'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 그 달 1일의 요일과 날짜 수 */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  return { leading: first.getDay(), daysInMonth }
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y!, (m ?? 1) - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default function CalendarPage() {
  const t = useTranslations('home')
  const today = todayISO()
  const [yearMonth, setYearMonth] = useState(() => monthOf(today))
  const [selected, setSelected] = useState<string | null>(null)

  const view = useMonthView(yearMonth)
  const openLog = useLogSheet((s) => s.openSheet)
  const { status } = useSession()
  const guest = useGuestStatus(status === 'authenticated')

  const [year, month] = yearMonth.split('-').map(Number)
  const { leading, daysInMonth } = monthGrid(year!, month!)

  /** 날짜별 기록 — 하루 여러 건이면 마커가 여러 개다 */
  const byDate = useMemo(() => {
    const map = new Map<string, { colorToken: number; minutes: number; isHoliday: boolean }[]>()
    if (!view) return map
    for (const log of view.logs) {
      const wp = view.workplaces.get(log.workplaceId)
      const entry = {
        colorToken: wp?.colorToken ?? 1,
        minutes: log.workedMinutes,
        isHoliday: log.isHoliday,
      }
      const list = map.get(log.date)
      if (list) list.push(entry)
      else map.set(log.date, [entry])
    }
    return map
  }, [view])

  const workedDays = byDate.size
  const totalMinutes = view?.summary.totalMinutes ?? 0
  const { h } = splitHours(totalMinutes)

  return (
    <Screen
      title={`${year}년 ${month}월`}
      action={
        <div className="flex gap-1.5">
          <IconButton label="이전 달" onClick={() => { setSelected(null); setYearMonth(shiftMonth(yearMonth, -1)) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </IconButton>
          <IconButton label="다음 달" onClick={() => { setSelected(null); setYearMonth(shiftMonth(yearMonth, 1)) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </IconButton>
        </div>
      }
    >
      {/* 요약은 실수령이 아니라 세전이다. 실수령은 월정산의 몫 */}
      <div className="flex gap-2 rounded-xl border border-hairline-soft bg-canvas px-4 py-3">
        <Summary label="일한 날" value={`${workedDays}일`} />
        <Summary label="일한 시간" value={`${h}시간`} />
        <Summary label={t('gross')} value={formatWon(view?.summary.grossPay ?? 0)} align="right" />
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-center text-[11px] font-semibold ${
              i === 0 ? 'text-coral-dark' : 'text-stone'
            }`}
          >
            {w}
          </div>
        ))}

        {Array.from({ length: leading }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const iso = `${yearMonth}-${pad(day)}`
          const entries = byDate.get(iso) ?? []
          const minutes = entries.reduce((s, e) => s + e.minutes, 0)
          const isToday = iso === today
          const isFuture = iso > today
          const hasHoliday = entries.some((e) => e.isHoliday)

          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture && entries.length === 0}
              onClick={() => {
                if (entries.length > 0) setSelected(iso)
                else if (!isFuture && guest.canRecord) openLog(iso)
              }}
              className={`flex min-h-[58px] flex-col items-center gap-[3px] rounded-md border pt-[5px] ${
                hasHoliday ? 'bg-coral-light' : entries.length > 0 ? 'bg-canvas' : 'bg-transparent'
              } ${isToday ? 'border-primary' : 'border-transparent'} ${
                isFuture ? 'opacity-40' : ''
              }`}
            >
              <span
                className={`tnum text-[13px] leading-none ${
                  entries.length > 0 ? 'font-medium text-ink' : 'font-normal text-muted'
                }`}
              >
                {day}
              </span>

              {entries.length > 0 && (
                <>
                  <span className="flex gap-[2px]">
                    {entries.slice(0, 4).map((e, idx) => (
                      <i
                        key={idx}
                        className="block h-[9px] w-[9px] rounded-xs border border-ink-deep/10"
                        style={{ background: colorVar(e.colorToken) }}
                      />
                    ))}
                  </span>
                  <span className="tnum text-[10.5px] font-medium text-steel">
                    {formatHoursShort(minutes)}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-1 text-center text-xs leading-relaxed text-stone">
        날짜를 누르면 그날 기록을 볼 수 있어요.
        <br />
        빈 날짜를 누르면 그날 일한 걸 적을 수 있어요.
      </p>

      <DayLogsSheet date={selected} onClose={() => setSelected(null)} />
    </Screen>
  )
}

function Summary({
  label,
  value,
  align,
}: {
  label: string
  value: string
  align?: 'right'
}) {
  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="text-xs font-medium text-steel">{label}</div>
      <div className="tnum mt-0.5 text-xl font-medium tracking-[-0.4px]">{value}</div>
    </div>
  )
}
