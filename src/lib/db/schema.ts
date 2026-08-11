import Dexie, { type EntityTable } from 'dexie'
import type { DeductionType, InsuranceFlags, PaySegment } from '@/lib/payroll'

/**
 * 로컬 우선 저장소. 서버 없이 완전히 동작한다.
 *
 * ⚠️ 스키마를 바꿀 때는 반드시 version(n).upgrade()를 함께 작성한다.
 * 로컬 전용 앱에서 마이그레이션 실패는 사용자 데이터 영구 소실이며 복구 수단이 없다.
 * 마이그레이션 전 자동 JSON 백업을 먼저 붙일 것.
 */

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type OtherDeductionMode = 'PER_DAY' | 'PER_MONTH' | 'RATE'

export interface OtherDeduction {
  type: 'AGENCY_FEE' | 'DORM' | 'MEAL' | 'TRANSPORT' | 'CUSTOM'
  label: string
  mode: OtherDeductionMode
  value: number
}

export interface Workplace {
  id: string
  name: string
  /** 1~8, --wp-N 토큰에 대응 */
  colorToken: number
  emoji: string
  defaultHourlyWage: number
  defaultBreakMinutes: number
  deductionType: DeductionType
  /** deductionType === 'INSURANCE_4'일 때만 의미가 있다 */
  insuranceFlags?: InsuranceFlags
  /** true면 연장·휴일·야간 가산이 붙지 않는다 */
  isUnder5Employees: boolean
  otherDeductions: OtherDeduction[]
  payCycle?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  /** 예: 10 → 다음 달 10일 지급 */
  payDayOfMonth?: number
  contactName?: string
  contactPhone?: string
  memo?: string
  /** 삭제 대신 보관. 삭제하면 과거 기록의 참조가 깨지고 증거가 사라진다 */
  isArchived: boolean
  sortOrder: number
  createdAt: string
}

export interface WorkLog {
  id: string
  workplaceId: string
  /** YYYY-MM-DD */
  date: string
  startTime?: string
  endTime?: string
  totalMinutes?: number
  breakMinutes: number
  isHoliday: boolean

  /** 기록 시점 고정값. 근무지 설정을 바꿔도 과거 기록 금액은 절대 변하지 않는다 */
  hourlyWageSnapshot: number
  deductionSnapshot: DeductionType
  insuranceFlagsSnapshot?: InsuranceFlags
  isUnder5EmployeesSnapshot: boolean

  workedMinutes: number
  regularMinutes: number
  overtimeMinutes: number
  holidayMinutes: number
  holidayOverMinutes: number
  nightMinutes: number
  breakdown: PaySegment[]
  grossPay: number

  paymentStatus: PaymentStatus
  paidAmount?: number
  paidAt?: string

  memo?: string
  photoIds: string[]

  /** ⚠️ 불변. 증거력의 핵심이라 어떤 업데이트 경로에서도 갱신하지 않는다 */
  createdAt: string
  updatedAt: string
  /** 사후 수정 횟수 — 투명성 */
  revisionCount: number
  /** null이면 미동기화 (Phase 2) */
  syncedAt?: string | null
}

export interface PaymentRecord {
  id: string
  workplaceId: string
  /** YYYY-MM */
  yearMonth: string
  amount: number
  paidAt: string
  method?: string
  memo?: string
}

export interface AppSettings {
  key: 'app'
  locale: string
  nightPayEnabled: boolean
  deviceKey: string
  nationality?: string
  onboardedAt?: string
  /** 최초 실행 시 법적 고지를 확인한 시각. 없으면 온보딩으로 보낸다 */
  legalNoticeAcceptedAt?: string
  schemaVersion: number
}

export class IlgikDB extends Dexie {
  workplaces!: EntityTable<Workplace, 'id'>
  workLogs!: EntityTable<WorkLog, 'id'>
  payments!: EntityTable<PaymentRecord, 'id'>
  settings!: EntityTable<AppSettings, 'key'>

  constructor() {
    super('ilgik')
    this.version(1).stores({
      workplaces: 'id, sortOrder, isArchived',
      workLogs: 'id, date, workplaceId, paymentStatus, [workplaceId+date]',
      payments: 'id, workplaceId, yearMonth, [workplaceId+yearMonth]',
      settings: 'key',
    })
  }
}

/**
 * 브라우저에서만 인스턴스를 만든다. 정적 export 빌드 시 서버에서 이 모듈이
 * 평가되면 indexedDB가 없어 실패한다.
 */
let _db: IlgikDB | null = null

export function getDB(): IlgikDB {
  if (typeof window === 'undefined') {
    throw new Error('getDB()는 브라우저에서만 호출할 수 있습니다.')
  }
  if (!_db) _db = new IlgikDB()
  return _db
}
