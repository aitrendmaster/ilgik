import {
  DAILY_BASE_MINUTES,
  HOLIDAY_BASE_MULTIPLIER,
  HOLIDAY_OVER8_MULTIPLIER,
  NIGHT_END_HOUR,
  NIGHT_EXTRA_MULTIPLIER,
  NIGHT_START_HOUR,
  OVERTIME_MULTIPLIER,
  RATE_3_3,
  dailyWithholdingTax,
  insuranceRateFor,
} from './rates'
import {
  PayrollInputError,
  type DayPayInput,
  type DayPayResult,
  type MonthlyPayResult,
  type PaySegment,
  type SegmentLabel,
  type OtherDeduction,
  type OtherDeductionLine,
  type WorkplaceGroup,
  type WorkplaceSubtotal,
} from './types'

const MINUTES_PER_DAY = 24 * 60

function parseTime(value: string, field: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!m) throw new PayrollInputError(`${field} 형식이 "HH:mm"이 아닙니다: ${value}`, 'INVALID_TIME')
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) {
    throw new PayrollInputError(`${field} 값이 범위를 벗어났습니다: ${value}`, 'INVALID_TIME')
  }
  return h * 60 + min
}

/**
 * 야간(22:00~06:00) 구간과 근무 구간의 겹치는 분.
 * 반개구간 [22:00, 06:00) — 22:00 정각 시작은 포함, 06:00 정각 종료는 미포함.
 * start/end는 근무 시작일 00:00 기준 분이며 end는 자정을 넘기면 1440을 더한 값이다.
 */
function nightOverlapMinutes(start: number, end: number): number {
  const nightStart = NIGHT_START_HOUR * 60 // 1320
  const nightEnd = NIGHT_END_HOUR * 60 // 360
  // 확장 축(최대 2일 반)에 걸치는 야간 창들
  const windows: Array<[number, number]> = [
    [0, nightEnd], // 전날 22:00에서 이어진 당일 00:00~06:00
    [nightStart, MINUTES_PER_DAY + nightEnd], // 당일 22:00 ~ 익일 06:00
    [MINUTES_PER_DAY + nightStart, 2 * MINUTES_PER_DAY + nightEnd],
  ]
  let total = 0
  for (const [a, b] of windows) {
    total += Math.max(0, Math.min(end, b) - Math.max(start, a))
  }
  return total
}

/**
 * 세그먼트 금액을 최대잔여법으로 배분해 합계가 grossPay와 정확히 일치하게 만든다.
 * 구간별로 반올림한 뒤 더하면 총액과 1~2원 어긋나고, 사용자는 "내역이 안 맞는다"고 판단한다.
 */
function distributeRounding(exact: number[], target: number): number[] {
  const floors = exact.map((v) => Math.floor(v))
  let remainder = target - floors.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (const { i } of order) {
    if (remainder <= 0) break
    result[i] = (result[i] as number) + 1
    remainder -= 1
  }
  return result
}

/**
 * 하루 급여 계산. docs/일당노트_서비스기획서_v1.md §2.5의 절차를 그대로 구현한다.
 *
 * 반올림은 일급 단위로 1회만 한다. 구간별로 반올림한 뒤 합산하면 누적 오차가 생긴다.
 */
export function calculateDayPay(input: DayPayInput): DayPayResult {
  const {
    startTime,
    endTime,
    totalMinutes,
    breakMinutes,
    isHoliday,
    hourlyWage,
    nightPayEnabled,
    isUnder5Employees,
  } = input

  if (!Number.isFinite(hourlyWage) || hourlyWage < 0) {
    throw new PayrollInputError('시급이 올바르지 않습니다.', 'INVALID_WAGE')
  }

  // 1) 실근로시간
  let workedMinutes: number
  let elapsedMinutes: number
  let startMin: number | null = null
  let endMin: number | null = null
  let crossesMidnight = false

  if (startTime && endTime) {
    startMin = parseTime(startTime, 'startTime')
    endMin = parseTime(endTime, 'endTime')
    if (endMin <= startMin) {
      endMin += MINUTES_PER_DAY // 자정 넘김
      crossesMidnight = true
    }
    elapsedMinutes = endMin - startMin
    workedMinutes = elapsedMinutes - breakMinutes
  } else if (typeof totalMinutes === 'number') {
    // 시간만 입력 모드에서는 입력값이 곧 실근로시간이므로 breakMinutes가 0이다.
    elapsedMinutes = totalMinutes
    workedMinutes = totalMinutes - breakMinutes
  } else {
    throw new PayrollInputError(
      '출퇴근 시각 또는 총 근무시간 중 하나는 있어야 합니다.',
      'NO_TIME_INPUT',
    )
  }

  if (workedMinutes < 0) {
    throw new PayrollInputError(
      '쉬는 시간이 일한 시간보다 깁니다.',
      'NEGATIVE_WORKED_MINUTES',
    )
  }

  // 2) 구간 분해
  const parts: Array<{ label: SegmentLabel; minutes: number; multiplier: number }> = []
  let regularMinutes = 0
  let overtimeMinutes = 0
  let holidayMinutes = 0
  let holidayOverMinutes = 0

  if (isUnder5Employees) {
    // 5인 미만 사업장은 연장·휴일·야간 가산 의무가 없다
    regularMinutes = workedMinutes
    if (workedMinutes > 0) parts.push({ label: 'flat', minutes: workedMinutes, multiplier: 1 })
  } else if (isHoliday) {
    holidayMinutes = Math.min(workedMinutes, DAILY_BASE_MINUTES)
    holidayOverMinutes = Math.max(workedMinutes - DAILY_BASE_MINUTES, 0)
    if (holidayMinutes > 0)
      parts.push({ label: 'holiday', minutes: holidayMinutes, multiplier: HOLIDAY_BASE_MULTIPLIER })
    if (holidayOverMinutes > 0)
      parts.push({
        label: 'holidayOver',
        minutes: holidayOverMinutes,
        multiplier: HOLIDAY_OVER8_MULTIPLIER,
      })
  } else {
    regularMinutes = Math.min(workedMinutes, DAILY_BASE_MINUTES)
    overtimeMinutes = Math.max(workedMinutes - DAILY_BASE_MINUTES, 0)
    if (regularMinutes > 0) parts.push({ label: 'regular', minutes: regularMinutes, multiplier: 1 })
    if (overtimeMinutes > 0)
      parts.push({ label: 'overtime', minutes: overtimeMinutes, multiplier: OVERTIME_MULTIPLIER })
  }

  // 3) 야간 가산 — 시각 입력이 있을 때만 계산 가능
  let nightMinutes = 0
  if (nightPayEnabled && !isUnder5Employees && startMin !== null && endMin !== null) {
    const rawNight = nightOverlapMinutes(startMin, endMin)
    // 휴게시간은 실제 시각을 받지 않으므로 전 구간에 시간 비례로 균등 차감한다.
    // (어느 한쪽으로 체계적으로 유리·불리하지 않은 배분)
    nightMinutes =
      elapsedMinutes > 0 ? Math.round((rawNight * workedMinutes) / elapsedMinutes) : 0
    if (nightMinutes > 0) {
      parts.push({ label: 'night', minutes: nightMinutes, multiplier: NIGHT_EXTRA_MULTIPLIER })
    }
  }

  // 4) 금액 — 반올림 1회
  const exactAmounts = parts.map((p) => (p.minutes / 60) * hourlyWage * p.multiplier)
  const exactTotal = exactAmounts.reduce((a, b) => a + b, 0)
  const grossPay = Math.round(exactTotal)
  const distributed = distributeRounding(exactAmounts, grossPay)

  const breakdown: PaySegment[] = parts.map((p, i) => ({
    label: p.label,
    minutes: p.minutes,
    multiplier: p.multiplier,
    amount: distributed[i] as number,
  }))

  return {
    workedMinutes,
    regularMinutes,
    overtimeMinutes,
    holidayMinutes,
    holidayOverMinutes,
    nightMinutes,
    breakdown,
    grossPay,
    crossesMidnight,
  }
}

/**
 * 근무지별 공제액. 근무지마다 공제 방식이 다른 것이 정상이다.
 * 전체 세전에 단일 요율을 곱하면 틀린다.
 */
function deductionForGroup(group: WorkplaceGroup, date: string): { amount: number; rate: number } {
  const gross = group.days.reduce((sum, d) => sum + d.grossPay, 0)
  switch (group.deductionType) {
    case 'RATE_3_3':
      return { amount: Math.round(gross * RATE_3_3), rate: RATE_3_3 }
    case 'DAILY_WORKER': {
      // 일 단위로 계산해 합산한다. 월 합계에 세율을 곱하면 틀린다.
      const amount = group.days.reduce((sum, d) => sum + dailyWithholdingTax(d.grossPay), 0)
      return { amount, rate: gross > 0 ? amount / gross : 0 }
    }
    case 'INSURANCE_4': {
      const flags = group.insuranceFlags ?? { pension: true, health: true, employment: true }
      const rate = insuranceRateFor(flags, date)
      return { amount: Math.round(gross * rate), rate }
    }
    case 'NONE':
      return { amount: 0, rate: 0 }
  }
}

/**
 * 기타 공제. 법정 공제와 분리해서 보여준다 —
 * 세금과 소개비를 한 덩어리로 묶으면 사용자가 무엇이 왜 빠졌는지 알 수 없다.
 */
function otherDeductionLines(
  items: OtherDeduction[] | undefined,
  gross: number,
  dayCount: number,
): OtherDeductionLine[] {
  if (!items?.length) return []
  return items
    .filter((d) => d.value > 0)
    .map((d) => ({
      label: d.label,
      amount:
        d.mode === 'PER_DAY'
          ? Math.round(d.value * dayCount)
          : d.mode === 'RATE'
            ? Math.round(gross * d.value)
            : Math.round(d.value),
    }))
    .filter((line) => line.amount > 0)
}

/**
 * 월 정산. date는 요율 테이블 조회에 쓰이므로 해당 월의 아무 날짜(예: "2026-08-01")를 넘긴다.
 */
export function calculateMonthlyPay(groups: WorkplaceGroup[], date: string): MonthlyPayResult {
  const byWorkplace: WorkplaceSubtotal[] = groups.map((group) => {
    const grossPay = group.days.reduce((sum, d) => sum + d.grossPay, 0)
    const totalMinutes = group.days.reduce((sum, d) => sum + d.workedMinutes, 0)
    const dayCount = group.days.length
    const { amount: legalDeduction, rate } = deductionForGroup(group, date)
    const otherLines = otherDeductionLines(group.otherDeductions, grossPay, dayCount)
    const otherDeduction = otherLines.reduce((s, l) => s + l.amount, 0)
    const deductionAmount = legalDeduction + otherDeduction

    return {
      workplaceId: group.workplaceId,
      grossPay,
      legalDeduction,
      otherDeduction,
      otherLines,
      deductionAmount,
      deductionRate: rate,
      netPay: grossPay - deductionAmount,
      totalMinutes,
      dayCount,
    }
  })

  const grossPay = byWorkplace.reduce((s, w) => s + w.grossPay, 0)
  const legalDeduction = byWorkplace.reduce((s, w) => s + w.legalDeduction, 0)
  const otherDeduction = byWorkplace.reduce((s, w) => s + w.otherDeduction, 0)
  const deductionAmount = legalDeduction + otherDeduction
  const totalMinutes = byWorkplace.reduce((s, w) => s + w.totalMinutes, 0)
  const dayCount = byWorkplace.reduce((s, w) => s + w.dayCount, 0)

  return {
    grossPay,
    legalDeduction,
    otherDeduction,
    deductionAmount,
    netPay: grossPay - deductionAmount,
    totalMinutes,
    dayCount,
    byWorkplace,
  }
}
