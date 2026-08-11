import { describe, expect, it } from 'vitest'
import { calculateDayPay, calculateMonthlyPay } from './calc'
import { dailyWithholdingTax, insuranceRateFor, minimumWageAt } from './rates'
import { PayrollInputError, type DayPayInput } from './types'

/**
 * 검증 케이스 T1~T14 — docs/일당노트_서비스기획서_v1.md §2.7
 * 이 표가 급여 엔진의 정본이다. 규칙을 바꿀 때는 여기부터 고친다.
 */

const WAGE = 10_320 // 2026년 최저임금
const MONTH = '2026-08-01'

function day(over: Partial<DayPayInput> = {}): DayPayInput {
  return {
    breakMinutes: 0,
    isHoliday: false,
    hourlyWage: WAGE,
    nightPayEnabled: false,
    isUnder5Employees: false,
    ...over,
  }
}

describe('연도별 상수 테이블', () => {
  it('날짜 기준으로 최저임금을 조회한다', () => {
    expect(minimumWageAt('2024-06-01')).toBe(9860)
    expect(minimumWageAt('2025-01-01')).toBe(10030)
    expect(minimumWageAt('2026-08-11')).toBe(10320)
    // 테이블 최초 발효일 이전은 최초 값으로 폴백
    expect(minimumWageAt('2020-01-01')).toBe(9860)
  })
})

describe('calculateDayPay', () => {
  it('T1 — 09:00~18:00, 휴게 60분 → 8시간 82,560원', () => {
    const r = calculateDayPay(day({ startTime: '09:00', endTime: '18:00', breakMinutes: 60 }))
    expect(r.workedMinutes).toBe(480)
    expect(r.grossPay).toBe(82_560)
    expect(r.overtimeMinutes).toBe(0)
    expect(r.crossesMidnight).toBe(false)
  })

  it('T2 — 09:00~22:00, 휴게 60분 → 기본 8h + 연장 4h = 144,480원', () => {
    const r = calculateDayPay(day({ startTime: '09:00', endTime: '22:00', breakMinutes: 60 }))
    expect(r.workedMinutes).toBe(720)
    expect(r.regularMinutes).toBe(480)
    expect(r.overtimeMinutes).toBe(240)
    expect(r.grossPay).toBe(144_480)
    expect(r.breakdown.map((s) => s.amount)).toEqual([82_560, 61_920])
  })

  it('T3 — 20:00~05:00 자정 넘김, 휴게 60분 → 8시간 (9시간 아님)', () => {
    const r = calculateDayPay(day({ startTime: '20:00', endTime: '05:00', breakMinutes: 60 }))
    expect(r.crossesMidnight).toBe(true)
    expect(r.workedMinutes).toBe(480) // 경과 9h − 휴게 1h
    expect(r.grossPay).toBe(82_560)
  })

  it('T4 — T3 + 야간수당 ON → 야간분을 휴게 비례로 배분해 가산', () => {
    const r = calculateDayPay(
      day({ startTime: '20:00', endTime: '05:00', breakMinutes: 60, nightPayEnabled: true }),
    )
    // 원 야간구간 22:00~05:00 = 420분, 휴게 비례 배분 → round(420 × 480/540) = 373
    expect(r.nightMinutes).toBe(373)
    const night = r.breakdown.find((s) => s.label === 'night')
    expect(night?.multiplier).toBe(0.5)
    // 기본 480분 + 야간 373분×0.5
    const expected = Math.round((480 / 60) * WAGE + (373 / 60) * WAGE * 0.5)
    expect(r.grossPay).toBe(expected)
  })

  it('T5 — 휴일 10시간 → 8h×1.5 + 2h×2.0 = 165,120원', () => {
    const r = calculateDayPay(day({ totalMinutes: 600, isHoliday: true }))
    expect(r.holidayMinutes).toBe(480)
    expect(r.holidayOverMinutes).toBe(120)
    expect(r.grossPay).toBe(165_120)
    expect(r.breakdown.map((s) => s.amount)).toEqual([123_840, 41_280])
  })

  it('T6 — 평일 10시간, 5인 미만 → 가산 없이 103,200원', () => {
    const r = calculateDayPay(day({ totalMinutes: 600, isUnder5Employees: true }))
    expect(r.overtimeMinutes).toBe(0)
    expect(r.grossPay).toBe(103_200)
    expect(r.breakdown).toHaveLength(1)
    expect(r.breakdown[0]?.label).toBe('flat')
  })

  it('T6-b — 5인 미만은 휴일·야간 가산도 붙지 않는다', () => {
    const r = calculateDayPay(
      day({
        startTime: '20:00',
        endTime: '05:00',
        breakMinutes: 60,
        isHoliday: true,
        nightPayEnabled: true,
        isUnder5Employees: true,
      }),
    )
    expect(r.nightMinutes).toBe(0)
    expect(r.grossPay).toBe(82_560)
  })

  it('T7 — 4시간 단시간 근무 → 41,280원', () => {
    const r = calculateDayPay(day({ totalMinutes: 240 }))
    expect(r.grossPay).toBe(41_280)
  })

  it('T8 — totalMinutes만 입력하면 야간 계산을 건너뛴다', () => {
    const r = calculateDayPay(day({ totalMinutes: 600, nightPayEnabled: true }))
    expect(r.nightMinutes).toBe(0)
    expect(r.grossPay).toBe(113_520) // 8h + 연장 2h×1.5
  })

  it('세그먼트 금액의 합은 항상 grossPay와 정확히 일치한다', () => {
    for (const minutes of [37, 125, 253, 481, 617, 719, 1013]) {
      for (const wage of [10_320, 11_500, 12_345, 9_999]) {
        const r = calculateDayPay(day({ totalMinutes: minutes, hourlyWage: wage }))
        const sum = r.breakdown.reduce((a, s) => a + s.amount, 0)
        expect(sum).toBe(r.grossPay)
      }
    }
  })

  it('휴게시간이 근무시간보다 길면 저장을 막는다', () => {
    expect(() =>
      calculateDayPay(day({ startTime: '09:00', endTime: '10:00', breakMinutes: 90 })),
    ).toThrowError(PayrollInputError)
  })

  it('시각도 총 시간도 없으면 거부한다', () => {
    expect(() => calculateDayPay(day())).toThrowError(PayrollInputError)
  })
})

describe('공제 계산', () => {
  it('일용근로소득 — 일당 15만원 이하는 세금 0원', () => {
    expect(dailyWithholdingTax(82_560)).toBe(0)
    expect(dailyWithholdingTax(150_000)).toBe(0)
  })

  it('일용근로소득 — 소액부징수(1,000원 미만)도 0원', () => {
    // (185,000 − 150,000) × 6% × 45% = 945원 → 1,000원 미만이라 징수하지 않음
    expect(dailyWithholdingTax(185_000)).toBe(0)
    // (200,000 − 150,000) × 6% × 45% = 1,350원 + 지방세 135원
    expect(dailyWithholdingTax(200_000)).toBe(1_485)
  })

  it('4대보험 — 전체 체크 9.404%, 국민연금 제외 4.904%', () => {
    const full = insuranceRateFor({ pension: true, health: true, employment: true }, MONTH)
    const noPension = insuranceRateFor({ pension: false, health: true, employment: true }, MONTH)
    expect(+(full * 100).toFixed(3)).toBe(9.404)
    expect(+(noPension * 100).toFixed(3)).toBe(4.904)
    // 장기요양은 임금이 아니라 건강보험료에 곱한다
    expect(full - noPension).toBeCloseTo(0.045, 10)
  })
})

describe('calculateMonthlyPay', () => {
  const twentyDays = Array.from({ length: 20 }, () => ({ grossPay: 82_560, workedMinutes: 480 }))
  const GROSS = 1_651_200

  it('T9 — 3.3% 공제', () => {
    const r = calculateMonthlyPay(
      [{ workplaceId: 'a', deductionType: 'RATE_3_3', days: twentyDays }],
      MONTH,
    )
    expect(r.grossPay).toBe(GROSS)
    expect(r.deductionAmount).toBe(54_490)
    expect(r.netPay).toBe(1_596_710)
  })

  it('T10 — 일용직 신고: 일당 82,560원이라 공제 0원', () => {
    const r = calculateMonthlyPay(
      [{ workplaceId: 'a', deductionType: 'DAILY_WORKER', days: twentyDays }],
      MONTH,
    )
    expect(r.deductionAmount).toBe(0)
    expect(r.netPay).toBe(GROSS)
  })

  it('T11 — 4대보험 전체 (9.404%)', () => {
    const r = calculateMonthlyPay(
      [
        {
          workplaceId: 'a',
          deductionType: 'INSURANCE_4',
          insuranceFlags: { pension: true, health: true, employment: true },
          days: twentyDays,
        },
      ],
      MONTH,
    )
    // 1,651,200 × 0.094040775
    expect(r.deductionAmount).toBe(155_280)
    expect(r.netPay).toBe(1_495_920)
  })

  it('T12 — 4대보험 국민연금 제외 (4.904%)', () => {
    const r = calculateMonthlyPay(
      [
        {
          workplaceId: 'a',
          deductionType: 'INSURANCE_4',
          insuranceFlags: { pension: false, health: true, employment: true },
          days: twentyDays,
        },
      ],
      MONTH,
    )
    // 1,651,200 × 0.049040775
    expect(r.deductionAmount).toBe(80_976)
    expect(r.netPay).toBe(1_570_224)
  })

  it('T13 — 공제 없음', () => {
    const r = calculateMonthlyPay(
      [{ workplaceId: 'a', deductionType: 'NONE', days: twentyDays }],
      MONTH,
    )
    expect(r.deductionAmount).toBe(0)
    expect(r.netPay).toBe(GROSS)
  })

  it('T14 — 근무지마다 공제 방식이 다르면 각각 계산해 합산한다', () => {
    const r = calculateMonthlyPay(
      [
        {
          workplaceId: 'samsung',
          deductionType: 'RATE_3_3',
          days: Array.from({ length: 14 }, () => ({ grossPay: 96_000, workedMinutes: 480 })),
        },
        {
          workplaceId: 'hanguk',
          deductionType: 'INSURANCE_4',
          insuranceFlags: { pension: false, health: true, employment: true },
          days: Array.from({ length: 5 }, () => ({ grossPay: 161_000, workedMinutes: 720 })),
        },
        {
          workplaceId: 'daesung',
          deductionType: 'NONE',
          days: Array.from({ length: 2 }, () => ({ grossPay: 82_560, workedMinutes: 480 })),
        },
      ],
      MONTH,
    )
    expect(r.grossPay).toBe(2_314_120)
    expect(r.dayCount).toBe(21)
    expect(r.totalMinutes).toBe(11_280) // 188시간
    // 1,344,000 × 3.3% = 44,352 / 805,000 × 4.904% = 39,478 / 0
    expect(r.byWorkplace[0]?.deductionAmount).toBe(44_352)
    expect(r.byWorkplace[1]?.deductionAmount).toBe(39_478)
    expect(r.byWorkplace[2]?.deductionAmount).toBe(0)
    expect(r.deductionAmount).toBe(83_830)
    expect(r.netPay).toBe(2_230_290)

    // 전체 세전에 단일 요율을 곱하면 틀린다는 것을 명시적으로 고정한다
    expect(r.deductionAmount).not.toBe(Math.round(r.grossPay * 0.033))
  })
})
