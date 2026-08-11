import { calculateDayPay } from '@/lib/payroll'
import type { DayPayInput } from '@/lib/payroll'
import { getDB, type AppSettings, type WorkLog, type Workplace } from './schema'
import { pickColorToken, pickEmoji } from './palette'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** "2026-08-25" → "2026-08" */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

// ── 설정 ──────────────────────────────────────────────────────
const SETTINGS_DEFAULTS: AppSettings = {
  key: 'app',
  locale: 'ko',
  nightPayEnabled: false,
  deviceKey: '',
  schemaVersion: 1,
}

export async function getSettings(): Promise<AppSettings> {
  const db = getDB()
  const existing = await db.settings.get('app')
  if (existing) return existing
  const created: AppSettings = { ...SETTINGS_DEFAULTS, deviceKey: uid() }
  await db.settings.put(created)
  return created
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings()
  await getDB().settings.put({ ...current, ...patch, key: 'app' })
}

// ── 근무지 ────────────────────────────────────────────────────
export type WorkplaceDraft = Omit<
  Workplace,
  'id' | 'createdAt' | 'sortOrder' | 'isArchived' | 'colorToken' | 'emoji'
> & {
  colorToken?: number
  emoji?: string
}

export async function listWorkplaces(includeArchived = false): Promise<Workplace[]> {
  const all = await getDB().workplaces.toArray()
  const filtered = includeArchived ? all : all.filter((w) => !w.isArchived)
  // 최근 사용순 — sortOrder는 기록할 때마다 갱신된다
  return filtered.sort((a, b) => b.sortOrder - a.sortOrder)
}

/**
 * 색·이모지 자동 배정은 "지금까지 쓰인 값"을 읽어서 정하므로
 * 읽기와 쓰기가 같은 트랜잭션 안에 있어야 한다.
 * 분리하면 동시에 두 개를 만들 때 둘 다 같은 색을 집는다 (저장 버튼 연타 포함).
 */
export async function createWorkplace(draft: WorkplaceDraft): Promise<Workplace> {
  const db = getDB()
  return db.transaction('rw', db.workplaces, async () => {
    const existing = await db.workplaces.toArray()
    const workplace: Workplace = {
      ...draft,
      id: uid(),
      colorToken: draft.colorToken ?? pickColorToken(existing.map((w) => w.colorToken)),
      emoji: draft.emoji ?? pickEmoji(existing.map((w) => w.emoji)),
      isArchived: false,
      sortOrder: Date.now(),
      createdAt: nowISO(),
    }
    await db.workplaces.put(workplace)
    return workplace
  })
}

export async function updateWorkplace(id: string, patch: Partial<Workplace>): Promise<void> {
  const db = getDB()
  const current = await db.workplaces.get(id)
  if (!current) return
  // createdAt은 어떤 경로로도 갱신하지 않는다
  const { createdAt: _ignored, id: _id, ...safe } = patch
  await db.workplaces.put({ ...current, ...safe })
}

/**
 * 삭제가 아니라 보관이다. 삭제하면 과거 기록의 참조가 깨지고 증거가 사라진다.
 * 근무지 화면에 삭제 버튼은 존재하지 않는다.
 */
export async function archiveWorkplace(id: string, archived = true): Promise<void> {
  await updateWorkplace(id, { isArchived: archived })
}

async function touchWorkplace(id: string): Promise<void> {
  await updateWorkplace(id, { sortOrder: Date.now() })
}

// ── 근무 기록 ──────────────────────────────────────────────────
export interface LogDraft {
  workplaceId: string
  date: string
  startTime?: string
  endTime?: string
  totalMinutes?: number
  breakMinutes: number
  isHoliday: boolean
  memo?: string
}

/**
 * 근무지 설정에서 계산 입력을 조립한다.
 * 여기서 만든 스냅샷이 기록에 고정되고, 이후 근무지를 수정해도 과거 금액은 변하지 않는다.
 */
export function buildDayPayInput(
  workplace: Workplace,
  draft: LogDraft,
  nightPayEnabled: boolean,
): DayPayInput {
  return {
    startTime: draft.startTime,
    endTime: draft.endTime,
    totalMinutes: draft.totalMinutes,
    breakMinutes: draft.breakMinutes,
    isHoliday: draft.isHoliday,
    hourlyWage: workplace.defaultHourlyWage,
    nightPayEnabled,
    isUnder5Employees: workplace.isUnder5Employees,
  }
}

export async function findSameDayLogs(workplaceId: string, date: string): Promise<WorkLog[]> {
  return getDB().workLogs.where('[workplaceId+date]').equals([workplaceId, date]).toArray()
}

export async function createLog(draft: LogDraft): Promise<WorkLog> {
  const db = getDB()
  const workplace = await db.workplaces.get(draft.workplaceId)
  if (!workplace) throw new Error('근무지를 찾을 수 없습니다.')
  const settings = await getSettings()

  const result = calculateDayPay(buildDayPayInput(workplace, draft, settings.nightPayEnabled))
  const ts = nowISO()

  const log: WorkLog = {
    id: uid(),
    workplaceId: workplace.id,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    totalMinutes: draft.totalMinutes,
    breakMinutes: draft.breakMinutes,
    isHoliday: draft.isHoliday,

    hourlyWageSnapshot: workplace.defaultHourlyWage,
    deductionSnapshot: workplace.deductionType,
    insuranceFlagsSnapshot: workplace.insuranceFlags,
    isUnder5EmployeesSnapshot: workplace.isUnder5Employees,

    workedMinutes: result.workedMinutes,
    regularMinutes: result.regularMinutes,
    overtimeMinutes: result.overtimeMinutes,
    holidayMinutes: result.holidayMinutes,
    holidayOverMinutes: result.holidayOverMinutes,
    nightMinutes: result.nightMinutes,
    breakdown: result.breakdown,
    grossPay: result.grossPay,

    // 받았다고 표시하기 전까지 전부 미수금이다
    paymentStatus: 'UNPAID',
    photoIds: [],

    createdAt: ts,
    updatedAt: ts,
    revisionCount: 0,
    syncedAt: null,
  }

  await db.workLogs.put(log)
  await touchWorkplace(workplace.id)
  return log
}

/** 같은 날짜·같은 근무지 기록을 덮어쓴다 (잘못 입력해서 고치는 경우) */
export async function replaceLog(existingId: string, draft: LogDraft): Promise<WorkLog> {
  const db = getDB()
  const existing = await db.workLogs.get(existingId)
  const created = await createLog(draft)
  if (existing) {
    // createdAt은 최초 기록 시점을 유지한다 — 증거력의 핵심
    await db.workLogs.put({
      ...created,
      id: existing.id,
      createdAt: existing.createdAt,
      paymentStatus: existing.paymentStatus,
      paidAmount: existing.paidAmount,
      paidAt: existing.paidAt,
      revisionCount: existing.revisionCount + 1,
    })
    await db.workLogs.delete(created.id)
    return (await db.workLogs.get(existing.id))!
  }
  return created
}

export async function deleteLog(id: string): Promise<WorkLog | undefined> {
  const db = getDB()
  const log = await db.workLogs.get(id)
  if (log) await db.workLogs.delete(id)
  return log
}

/** 되돌리기 — 삭제한 기록을 그대로 되살린다 */
export async function restoreLog(log: WorkLog): Promise<void> {
  await getDB().workLogs.put(log)
}

export async function listLogsInMonth(yearMonth: string): Promise<WorkLog[]> {
  const logs = await getDB()
    .workLogs.where('date')
    .between(`${yearMonth}-00`, `${yearMonth}-99`, true, true)
    .toArray()
  return logs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export async function listRecentLogs(limit = 5): Promise<WorkLog[]> {
  const logs = await getDB().workLogs.orderBy('date').reverse().limit(limit).toArray()
  return logs
}

export async function setPaymentStatus(
  id: string,
  status: WorkLog['paymentStatus'],
  paidAmount?: number,
): Promise<void> {
  const db = getDB()
  const log = await db.workLogs.get(id)
  if (!log) return
  await db.workLogs.put({
    ...log,
    paymentStatus: status,
    paidAmount,
    paidAt: status === 'PAID' || status === 'PARTIAL' ? nowISO() : undefined,
    updatedAt: nowISO(),
  })
}

// ── 백업 / 복원 ────────────────────────────────────────────────
export interface BackupFile {
  format: 'ilgik-backup'
  version: 1
  exportedAt: string
  workplaces: Workplace[]
  workLogs: WorkLog[]
  settings: AppSettings | null
}

/**
 * 기기 분실 = 증거 전소를 막는 최소 장치.
 * Phase 2 동기화 전까지 사용자가 가진 유일한 백업 수단이다.
 */
export async function exportBackup(): Promise<BackupFile> {
  const db = getDB()
  const [workplaces, workLogs, settings] = await Promise.all([
    db.workplaces.toArray(),
    db.workLogs.toArray(),
    db.settings.get('app'),
  ])
  return {
    format: 'ilgik-backup',
    version: 1,
    exportedAt: nowISO(),
    workplaces,
    workLogs,
    settings: settings ?? null,
  }
}

export async function importBackup(file: BackupFile): Promise<{ workplaces: number; logs: number }> {
  if (file.format !== 'ilgik-backup') throw new Error('일당노트 백업 파일이 아닙니다.')
  const db = getDB()
  await db.transaction('rw', db.workplaces, db.workLogs, db.settings, async () => {
    await db.workplaces.bulkPut(file.workplaces)
    await db.workLogs.bulkPut(file.workLogs)
    if (file.settings) await db.settings.put({ ...file.settings, key: 'app' })
  })
  return { workplaces: file.workplaces.length, logs: file.workLogs.length }
}

export async function clearAll(): Promise<void> {
  const db = getDB()
  await db.transaction('rw', db.workplaces, db.workLogs, db.payments, async () => {
    await db.workplaces.clear()
    await db.workLogs.clear()
    await db.payments.clear()
  })
}
