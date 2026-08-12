/** 공제 방식 — docs/일당노트_서비스기획서_v1.md §2.2 */
export type DeductionType =
  | 'RATE_3_3' // 3.3% 떼는 곳 — 인력사무소 사업소득 처리. 가장 흔함
  | 'DAILY_WORKER' // 일용직으로 신고하는 곳 — 일당 15만원 이하는 세금 0원
  | 'INSURANCE_4' // 4대보험 내는 곳 — 아래 InsuranceFlags로 항목별 산출
  | 'NONE' // 전액 받는 곳

/**
 * 국민연금은 상호주의라 캄보디아·네팔·미얀마·태국 등은 당연적용 대상이 아니고,
 * E-9은 고용보험도 임의가입이다. 9.4% 일괄 적용은 최대 사용자군에서 틀린다.
 * 국적 판정 로직을 앱에 넣으면 법령 해석 책임을 지게 되므로
 * 사용자가 급여명세서를 보고 체크하게 한다.
 */
export interface InsuranceFlags {
  pension: boolean
  health: boolean
  employment: boolean
}

/**
 * 법정 공제 외에 실제로 봉투에서 빠지는 것들.
 * 인력사무소는 일당의 8~10%를 소개비로 뗀다. 이게 빠지면 앱 금액과
 * 실제 받는 돈이 안 맞고, 사용자는 앱이 틀렸다고 판단한다.
 */
export type OtherDeductionType = 'AGENCY_FEE' | 'DORM' | 'MEAL' | 'TRANSPORT' | 'CUSTOM'
export type OtherDeductionMode = 'PER_DAY' | 'PER_MONTH' | 'RATE'

export interface OtherDeduction {
  type: OtherDeductionType
  label: string
  mode: OtherDeductionMode
  /** PER_DAY·PER_MONTH는 원, RATE는 0~1 비율 */
  value: number
}

export type SegmentLabel =
  | 'regular' // 기본 ×1.0
  | 'overtime' // 연장 ×1.5
  | 'holiday' // 휴일 8시간 이내 ×1.5
  | 'holidayOver' // 휴일 8시간 초과 ×2.0
  | 'night' // 야간 가산 ×0.5 (다른 구간과 중복 적용)
  | 'flat' // 5인 미만 사업장 — 가산 없음 ×1.0

export interface PaySegment {
  label: SegmentLabel
  minutes: number
  multiplier: number
  /** 원 단위. 모든 세그먼트의 합은 grossPay와 정확히 일치한다 (최대잔여법 보정) */
  amount: number
}

export interface DayPayInput {
  /** "HH:mm" — 시각 입력 모드 */
  startTime?: string
  /** "HH:mm" — 자정을 넘기면 익일로 간주 */
  endTime?: string
  /** 시간만 입력 모드. 이 모드에서는 입력값이 곧 실근로시간이므로 breakMinutes는 0이다 */
  totalMinutes?: number
  breakMinutes: number
  isHoliday: boolean
  hourlyWage: number
  nightPayEnabled: boolean
  /** true면 연장·휴일·야간 가산이 모두 붙지 않는다 (근로기준법 적용 제외) */
  isUnder5Employees: boolean
}

export interface DayPayResult {
  workedMinutes: number
  regularMinutes: number
  overtimeMinutes: number
  holidayMinutes: number
  holidayOverMinutes: number
  nightMinutes: number
  breakdown: PaySegment[]
  grossPay: number
  /** 자정을 넘긴 근무 */
  crossesMidnight: boolean
}

export interface DayLogLike {
  grossPay: number
  workedMinutes: number
}

export interface WorkplaceGroup {
  workplaceId: string
  deductionType: DeductionType
  insuranceFlags?: InsuranceFlags
  otherDeductions?: OtherDeduction[]
  days: DayLogLike[]
}

export interface OtherDeductionLine {
  label: string
  amount: number
}

export interface WorkplaceSubtotal {
  workplaceId: string
  grossPay: number
  /** 세금·4대보험 */
  legalDeduction: number
  /** 소개비·숙소비 등 */
  otherDeduction: number
  otherLines: OtherDeductionLine[]
  /** 법정 + 기타 */
  deductionAmount: number
  /** 0~1. INSURANCE_4는 체크된 항목 합, DAILY_WORKER는 실효세율(참고용) */
  deductionRate: number
  netPay: number
  totalMinutes: number
  dayCount: number
}

export interface MonthlyPayResult {
  grossPay: number
  legalDeduction: number
  otherDeduction: number
  deductionAmount: number
  netPay: number
  totalMinutes: number
  dayCount: number
  byWorkplace: WorkplaceSubtotal[]
}

export class PayrollInputError extends Error {
  constructor(
    message: string,
    readonly code: 'NEGATIVE_WORKED_MINUTES' | 'NO_TIME_INPUT' | 'INVALID_TIME' | 'INVALID_WAGE',
  ) {
    super(message)
    this.name = 'PayrollInputError'
  }
}
