import { calculateDayPay, calculateMonthlyPay } from '@/lib/payroll'
import type { DeductionType, InsuranceFlags, MonthlyPayResult } from '@/lib/payroll'

/**
 * Phase 0 데모 데이터.
 *
 * 실제 급여 엔진으로 계산해 화면에 흘린다. 숫자를 하드코딩하지 않으므로
 * 엔진을 고치면 화면도 같이 움직이고, 배포본에서 계산 결과를 눈으로 검증할 수 있다.
 * Phase 1-B에서 Dexie 조회로 교체된다.
 */

export interface SeedWorkplace {
  id: string
  name: string
  emoji: string
  /** 1~8, --wp-N 토큰 */
  colorToken: number
  hourlyWage: number
  deductionType: DeductionType
  insuranceFlags?: InsuranceFlags
  isUnder5Employees: boolean
  /** 이 근무지의 이번 달 기록이 아직 미지급인지 */
  unpaid: boolean
  /** YYYY-MM-DD */
  dates: string[]
  minutesPerDay: number
}

export const SEED_MONTH = '2026-08'

export const SEED_WORKPLACES: SeedWorkplace[] = [
  {
    id: 'samsung',
    name: '삼성전기',
    emoji: '🏭',
    colorToken: 6,
    hourlyWage: 12_000,
    deductionType: 'RATE_3_3',
    isUnder5Employees: false,
    unpaid: false,
    minutesPerDay: 480,
    dates: [
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-10',
      '2026-08-11',
      '2026-08-14',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-25',
    ],
  },
  {
    id: 'hanguk',
    name: '한국공업',
    emoji: '🔩',
    colorToken: 1,
    hourlyWage: 11_500,
    deductionType: 'INSURANCE_4',
    // 국민연금 상호주의로 적용제외인 국적을 가정
    insuranceFlags: { pension: false, health: true, employment: true },
    isUnder5Employees: false,
    unpaid: true,
    minutesPerDay: 720,
    dates: ['2026-08-07', '2026-08-08', '2026-08-12', '2026-08-13', '2026-08-24'],
  },
  {
    id: 'daesung',
    name: '대성물류',
    emoji: '🚚',
    colorToken: 3,
    hourlyWage: 10_320,
    deductionType: 'NONE',
    isUnder5Employees: false,
    unpaid: false,
    minutesPerDay: 480,
    dates: ['2026-08-01', '2026-08-22'],
  },
]

export interface SeedLog {
  id: string
  date: string
  workplace: SeedWorkplace
  workedMinutes: number
  grossPay: number
  unpaid: boolean
}

export interface SeedMonth {
  monthLabel: { year: number; month: number }
  logs: SeedLog[]
  summary: MonthlyPayResult
  unpaidTotal: number
  workplaceById: Map<string, SeedWorkplace>
}

export function buildSeedMonth(): SeedMonth {
  const logs: SeedLog[] = []

  for (const wp of SEED_WORKPLACES) {
    for (const date of wp.dates) {
      const day = calculateDayPay({
        totalMinutes: wp.minutesPerDay,
        breakMinutes: 0, // 시간만 입력 모드 — 입력값이 곧 실근로시간
        isHoliday: false,
        hourlyWage: wp.hourlyWage,
        nightPayEnabled: false,
        isUnder5Employees: wp.isUnder5Employees,
      })
      logs.push({
        id: `${wp.id}-${date}`,
        date,
        workplace: wp,
        workedMinutes: day.workedMinutes,
        grossPay: day.grossPay,
        unpaid: wp.unpaid,
      })
    }
  }

  logs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const summary = calculateMonthlyPay(
    SEED_WORKPLACES.map((wp) => ({
      workplaceId: wp.id,
      deductionType: wp.deductionType,
      insuranceFlags: wp.insuranceFlags,
      days: logs
        .filter((l) => l.workplace.id === wp.id)
        .map((l) => ({ grossPay: l.grossPay, workedMinutes: l.workedMinutes })),
    })),
    `${SEED_MONTH}-01`,
  )

  const unpaidTotal = logs.filter((l) => l.unpaid).reduce((sum, l) => sum + l.grossPay, 0)

  const [year, month] = SEED_MONTH.split('-').map(Number)

  return {
    monthLabel: { year: year!, month: month! },
    logs,
    summary,
    unpaidTotal,
    workplaceById: new Map(SEED_WORKPLACES.map((w) => [w.id, w])),
  }
}
