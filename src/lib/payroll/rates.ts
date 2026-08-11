import type { InsuranceFlags } from './types'

/**
 * ⚠️ 법령 확인 필요
 * 아래 수치는 공개 자료 기준 정리다. 출시 전 노무사 또는 근로복지공단·건강보험공단
 * 고시로 반드시 재확인하고, 확인 일자를 이 주석에 남긴다.
 * 최저임금과 보험 요율은 매년 1월 1일 바뀐다. 상수를 하드코딩하지 말고
 * 반드시 이 테이블을 date 기준으로 조회할 것.
 *
 * 최종 확인: (미확인 — 노무사 검토 전)
 */

interface EffectiveEntry {
  /** YYYY-MM-DD, 이 날짜부터 적용 */
  from: string
}

interface MinimumWageEntry extends EffectiveEntry {
  hourly: number
}

export const MINIMUM_WAGE: readonly MinimumWageEntry[] = [
  { from: '2024-01-01', hourly: 9860 },
  { from: '2025-01-01', hourly: 10030 },
  { from: '2026-01-01', hourly: 10320 },
] as const

export interface InsuranceRateEntry extends EffectiveEntry {
  /** 국민연금 근로자 부담 (임금 대비) */
  pension: number
  /** 건강보험 근로자 부담 (임금 대비) */
  health: number
  /** 장기요양 — ⚠️ 임금이 아니라 "건강보험료"에 곱한다 */
  longTermCareOfHealth: number
  /** 고용보험 실업급여 근로자 부담 (임금 대비) */
  employment: number
}

export const INSURANCE_RATES: readonly InsuranceRateEntry[] = [
  {
    from: '2025-01-01',
    pension: 0.045,
    health: 0.03545,
    longTermCareOfHealth: 0.1295,
    employment: 0.009,
  },
  // 2026 요율 확정 시 여기에 추가한다. 미확정이면 직전 연도 값이 그대로 조회되고
  // UI에는 '잠정' 배지를 노출한다.
] as const

/** 일용근로소득 원천징수 — 소득세법 */
export const DAILY_TAX = {
  /** 일 공제액. 일당이 이 금액 이하면 과세표준이 0이 된다 */
  dailyDeduction: 150_000,
  /** 기본세율 6% */
  rate: 0.06,
  /** 근로소득세액공제 55% */
  taxCredit: 0.55,
  /** 지방소득세 = 소득세의 10% */
  localTaxRate: 0.1,
  /** 소액부징수 — 산출세액이 이 금액 미만이면 징수하지 않는다 */
  minCollect: 1_000,
} as const

/** 3.3% = 소득세 3% + 지방소득세 0.3% */
export const RATE_3_3 = 0.033

export const OVERTIME_MULTIPLIER = 1.5
export const HOLIDAY_BASE_MULTIPLIER = 1.5
export const HOLIDAY_OVER8_MULTIPLIER = 2.0
export const NIGHT_EXTRA_MULTIPLIER = 0.5
export const NIGHT_START_HOUR = 22
export const NIGHT_END_HOUR = 6
/** 법정 기준 근로시간 (분) */
export const DAILY_BASE_MINUTES = 8 * 60

function pickEffective<T extends EffectiveEntry>(table: readonly T[], date: string): T {
  let found: T | undefined
  for (const entry of table) {
    if (entry.from <= date) found = entry
    else break
  }
  // date가 테이블 최초 발효일보다 이르면 최초 값을 쓴다
  return found ?? (table[0] as T)
}

/** 해당 날짜에 적용되는 최저임금(시급) */
export function minimumWageAt(date: string): number {
  return pickEffective(MINIMUM_WAGE, date).hourly
}

/** 해당 날짜에 적용되는 4대보험 요율 원본 */
export function insuranceRatesAt(date: string): InsuranceRateEntry {
  return pickEffective(INSURANCE_RATES, date)
}

/**
 * 체크된 보험 항목만 합산한 근로자 부담 요율.
 * 전체 체크 시 ≈ 0.09404 (9.404%), 국민연금 제외 시 ≈ 0.04904 (4.904%).
 */
export function insuranceRateFor(flags: InsuranceFlags, date: string): number {
  const r = insuranceRatesAt(date)
  let rate = 0
  if (flags.pension) rate += r.pension
  // 장기요양은 건강보험료에 곱하므로 건강보험을 뗄 때만 함께 발생한다
  if (flags.health) rate += r.health * (1 + r.longTermCareOfHealth)
  if (flags.employment) rate += r.employment
  return rate
}

/**
 * 일용근로소득 원천징수세액 (소득세 + 지방소득세).
 * 일당 15만원 이하면 0원이고, 소액부징수(1,000원 미만)도 0원이다.
 * → 8시간 최저임금 근무(82,560원)에는 원래 세금이 없다.
 *   3.3%를 떼서 보여주면 실수령을 과소 표시하게 된다.
 */
export function dailyWithholdingTax(dailyGross: number): number {
  const taxable = Math.max(0, dailyGross - DAILY_TAX.dailyDeduction)
  if (taxable === 0) return 0
  const incomeTax = Math.round(taxable * DAILY_TAX.rate * (1 - DAILY_TAX.taxCredit))
  if (incomeTax < DAILY_TAX.minCollect) return 0
  const localTax = Math.round(incomeTax * DAILY_TAX.localTaxRate)
  return incomeTax + localTax
}
