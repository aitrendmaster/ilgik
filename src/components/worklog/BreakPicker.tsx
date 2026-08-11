'use client'

import { useEffect, useState } from 'react'
import { splitHours } from '@/lib/format'

/**
 * 쉬는 시간 입력.
 *
 * "60분"만 보여주면 하루 총합인지 1회분인지 알 수 없다.
 * 실제 현장은 "10분씩 4번 쉬고 점심 1시간"처럼 섞여 있어서
 * 사용자가 머릿속으로 더하게 두면 틀린다.
 * → 밥 먹는 시간과 짧은 휴식을 따로 받고 합계를 앱이 계산해 보여준다.
 */

const MEALS = [0, 30, 60, 90] as const
const SHORT_UNIT = 10
const MAX_SHORT = 12

/** 총 분 → { meal, shortCount }. 밥 시간을 먼저 크게 떼고 나머지를 10분 단위로 본다 */
export function decomposeBreak(total: number): { meal: number; shortCount: number } {
  const meal = [...MEALS].reverse().find((m) => m <= total) ?? 0
  const rest = Math.max(0, total - meal)
  return { meal, shortCount: Math.min(MAX_SHORT, Math.round(rest / SHORT_UNIT)) }
}

export function composeBreak(meal: number, shortCount: number): number {
  return meal + shortCount * SHORT_UNIT
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '없음'
  const { h, m } = splitHours(minutes)
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

export function BreakPicker({
  value,
  onChange,
  compact = false,
}: {
  value: number
  onChange: (minutes: number) => void
  compact?: boolean
}) {
  /**
   * meal/shortCount를 총합에서 매번 역산하면 안 된다.
   * "1시간"을 고르고 10분을 4번 더하면 100분이 되고, 역산은 이를
   * "1시간 30분 + 1번"으로 되돌려 버튼이 제멋대로 튄다.
   * 사용자가 고른 조합을 그대로 들고 있다가, 바깥에서 값이 바뀔 때만 다시 나눈다.
   */
  const [meal, setMeal] = useState(() => decomposeBreak(value).meal)
  const [shortCount, setShortCount] = useState(() => decomposeBreak(value).shortCount)

  useEffect(() => {
    if (composeBreak(meal, shortCount) === value) return
    const next = decomposeBreak(value)
    setMeal(next.meal)
    setShortCount(next.shortCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const apply = (nextMeal: number, nextCount: number) => {
    setMeal(nextMeal)
    setShortCount(nextCount)
    onChange(composeBreak(nextMeal, nextCount))
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-steel">
          하루에 쉰 시간을 <span className="text-ink">다 합쳐서</span>
        </span>
        <span className="tnum text-lg font-semibold">{formatDuration(value)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-steel">밥 먹는 시간</span>
        <div className="grid grid-cols-4 gap-1.5">
          {MEALS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={meal === m}
              onClick={() => apply(m, shortCount)}
              className={`h-12 rounded-full text-[15px] ${
                meal === m
                  ? 'bg-primary font-semibold text-on-primary'
                  : 'border border-hairline-strong bg-canvas font-medium text-ink'
              }`}
            >
              {m === 0 ? '없음' : formatDuration(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-steel">짧게 쉬는 시간 (10분씩)</span>
        <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2">
          <button
            type="button"
            aria-label="쉬는 횟수 줄이기"
            onClick={() => apply(meal, Math.max(0, shortCount - 1))}
            className="h-12 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
          >
            −
          </button>
          <span className="tnum text-center text-[15px] font-medium">
            {shortCount === 0 ? '안 쉬었어요' : `${shortCount}번 · ${shortCount * SHORT_UNIT}분`}
          </span>
          <button
            type="button"
            aria-label="쉬는 횟수 늘리기"
            onClick={() => apply(meal, Math.min(MAX_SHORT, shortCount + 1))}
            className="h-12 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
          >
            +
          </button>
        </div>
      </div>

      {!compact && (
        <p className="m-0 border-t border-hairline pt-2.5 text-[12.5px] leading-relaxed text-steel">
          예를 들어 <strong className="font-semibold text-ink">10분씩 4번 쉬고 점심 1시간</strong>이면
          {' '}밥 먹는 시간 1시간 + 짧게 쉬는 시간 4번 → 다 합쳐서 1시간 40분이에요.
        </p>
      )}
    </div>
  )
}
