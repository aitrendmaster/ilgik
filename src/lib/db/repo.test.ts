import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { calculateMonthlyPay } from '@/lib/payroll'
import {
  archiveWorkplace,
  clearAll,
  ensureSettings,
  readSettings,
  createLog,
  createWorkplace,
  exportBackup,
  findSameDayLogs,
  importBackup,
  listLogsInMonth,
  listWorkplaces,
  replaceLog,
  updateSettings,
  updateWorkplace,
  type WorkplaceDraft,
} from './repo'
import { getDB } from './schema'

/**
 * README에 못 박은 불변 규칙들을 실제 IndexedDB 위에서 검증한다.
 * 이 규칙이 깨지면 사용자가 만든 증거가 조용히 오염된다.
 */

function draft(over: Partial<WorkplaceDraft> = {}): WorkplaceDraft {
  return {
    name: '한국공업',
    defaultHourlyWage: 11_500,
    defaultBreakMinutes: 60,
    deductionType: 'RATE_3_3',
    isUnder5Employees: false,
    otherDeductions: [],
    ...over,
  }
}

beforeEach(async () => {
  await clearAll()
  await getDB().settings.clear()
})

describe('설정', () => {
  it('읽기 경로는 행을 만들지 않는다', async () => {
    // liveQuery 쿼리어 안에서 쓰면 Dexie가 ReadOnlyError를 던지고
    // 설정이 없는 상태 — 즉 모든 첫 방문자 — 에서 앱이 죽는다.
    const s = await readSettings()
    expect(s.nightPayEnabled).toBe(false)
    expect(await getDB().settings.get('app')).toBeUndefined()
  })

  it('ensureSettings는 한 번만 만들고 deviceKey를 유지한다', async () => {
    const first = await ensureSettings()
    expect(first.deviceKey).not.toBe('')
    const second = await ensureSettings()
    expect(second.deviceKey).toBe(first.deviceKey)
    expect(await getDB().settings.count()).toBe(1)
  })

  it('행이 없어도 updateSettings가 동작한다', async () => {
    await updateSettings({ nightPayEnabled: true })
    expect((await readSettings()).nightPayEnabled).toBe(true)
  })
})

describe('근무지', () => {
  it('색과 이모지를 미사용 값 중에서 자동 배정한다', async () => {
    const created = await Promise.all([
      createWorkplace(draft({ name: 'A' })),
      createWorkplace(draft({ name: 'B' })),
      createWorkplace(draft({ name: 'C' })),
    ])
    const colors = created.map((w) => w.colorToken)
    const emojis = created.map((w) => w.emoji)
    expect(new Set(colors).size).toBe(3)
    expect(new Set(emojis).size).toBe(3)
  })

  it('보관해도 목록에서만 숨고 데이터는 남는다', async () => {
    const wp = await createWorkplace(draft())
    await archiveWorkplace(wp.id)
    expect(await listWorkplaces()).toHaveLength(0)
    expect(await listWorkplaces(true)).toHaveLength(1)
  })

  it('createdAt은 수정 경로로 갱신되지 않는다', async () => {
    const wp = await createWorkplace(draft())
    await updateWorkplace(wp.id, {
      name: '바뀐이름',
      createdAt: '1999-01-01T00:00:00.000Z',
    })
    const after = await getDB().workplaces.get(wp.id)
    expect(after?.name).toBe('바뀐이름')
    expect(after?.createdAt).toBe(wp.createdAt)
  })
})

describe('기록 — 스냅샷 불변', () => {
  it('시급을 올려도 지난 기록의 금액은 바뀌지 않는다', async () => {
    const wp = await createWorkplace(draft({ defaultHourlyWage: 11_500 }))
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 720,
      breakMinutes: 0,
      isHoliday: false,
    })
    expect(log.grossPay).toBe(161_000) // 8h×1.0 + 4h×1.5
    expect(log.hourlyWageSnapshot).toBe(11_500)

    await updateWorkplace(wp.id, { defaultHourlyWage: 20_000 })

    const after = await getDB().workLogs.get(log.id)
    expect(after?.grossPay).toBe(161_000)
    expect(after?.hourlyWageSnapshot).toBe(11_500)
  })

  it('공제 방식을 바꿔도 지난 기록의 스냅샷은 그대로다', async () => {
    const wp = await createWorkplace(draft({ deductionType: 'RATE_3_3' }))
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })
    await updateWorkplace(wp.id, { deductionType: 'NONE' })

    const after = await getDB().workLogs.get(log.id)
    expect(after?.deductionSnapshot).toBe('RATE_3_3')
  })

  it('시간만 입력 모드는 입력값을 그대로 실근로시간으로 쓴다', async () => {
    // 근무지 기본 휴게 60분이 있어도 여기서 빼면 12시간을 누른 사용자에게 11시간이 나온다
    const wp = await createWorkplace(draft({ defaultBreakMinutes: 60 }))
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 720,
      breakMinutes: 0,
      isHoliday: false,
    })
    expect(log.workedMinutes).toBe(720)
  })

  it('출퇴근 시각 모드는 휴게를 빼고 자정을 넘긴다', async () => {
    const wp = await createWorkplace(draft({ defaultHourlyWage: 10_320 }))
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      startTime: '20:00',
      endTime: '05:00',
      breakMinutes: 60,
      isHoliday: false,
    })
    expect(log.workedMinutes).toBe(480)
    expect(log.grossPay).toBe(82_560)
  })

  it('새 기록은 항상 미수금으로 시작한다', async () => {
    const wp = await createWorkplace(draft())
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })
    expect(log.paymentStatus).toBe('UNPAID')
  })
})

describe('같은 날 중복', () => {
  it('같은 날 같은 곳이면 감지하고, 따로 추가하면 2건이 남는다', async () => {
    const wp = await createWorkplace(draft())
    const base = {
      workplaceId: wp.id,
      date: '2026-08-24',
      breakMinutes: 0,
      isHoliday: false,
    }
    await createLog({ ...base, totalMinutes: 240 })
    expect(await findSameDayLogs(wp.id, '2026-08-24')).toHaveLength(1)

    await createLog({ ...base, totalMinutes: 300 })
    const same = await findSameDayLogs(wp.id, '2026-08-24')
    expect(same).toHaveLength(2)
    expect(same.reduce((s, l) => s + l.workedMinutes, 0)).toBe(540)
  })

  it('바꾸기는 id와 createdAt을 유지하고 수정 횟수를 올린다', async () => {
    const wp = await createWorkplace(draft())
    const first = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 240,
      breakMinutes: 0,
      isHoliday: false,
    })

    const replaced = await replaceLog(first.id, {
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })

    expect(replaced.id).toBe(first.id)
    expect(replaced.createdAt).toBe(first.createdAt) // 증거력의 핵심
    expect(replaced.revisionCount).toBe(1)
    expect(replaced.workedMinutes).toBe(480)
    expect(await findSameDayLogs(wp.id, '2026-08-24')).toHaveLength(1)
  })

  it('하루에 두 곳에서 일한 경우를 기록할 수 있다', async () => {
    const a = await createWorkplace(draft({ name: 'A', defaultHourlyWage: 12_000 }))
    const b = await createWorkplace(draft({ name: 'B', defaultHourlyWage: 11_500 }))
    await createLog({
      workplaceId: a.id,
      date: '2026-08-07',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })
    await createLog({
      workplaceId: b.id,
      date: '2026-08-07',
      totalMinutes: 720,
      breakMinutes: 0,
      isHoliday: false,
    })
    const logs = await listLogsInMonth('2026-08')
    expect(logs).toHaveLength(2)
    expect(logs.reduce((s, l) => s + l.grossPay, 0)).toBe(96_000 + 161_000)
  })
})

describe('월 조회', () => {
  it('해당 월 기록만 가져온다', async () => {
    const wp = await createWorkplace(draft())
    for (const date of ['2026-07-31', '2026-08-01', '2026-08-31', '2026-09-01']) {
      await createLog({
        workplaceId: wp.id,
        date,
        totalMinutes: 480,
        breakMinutes: 0,
        isHoliday: false,
      })
    }
    const august = await listLogsInMonth('2026-08')
    expect(august.map((l) => l.date)).toEqual(['2026-08-31', '2026-08-01'])
  })

  it('보관된 근무지의 지난 기록도 그대로 조회된다', async () => {
    const wp = await createWorkplace(draft())
    await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })
    await archiveWorkplace(wp.id)
    expect(await listLogsInMonth('2026-08')).toHaveLength(1)
  })

  it('근무지별 공제 방식이 섞여도 각각 계산해 합산한다', async () => {
    const a = await createWorkplace(
      draft({ name: 'A', defaultHourlyWage: 12_000, deductionType: 'RATE_3_3' }),
    )
    const b = await createWorkplace(
      draft({
        name: 'B',
        defaultHourlyWage: 11_500,
        deductionType: 'INSURANCE_4',
        insuranceFlags: { pension: false, health: true, employment: true },
      }),
    )
    await createLog({
      workplaceId: a.id,
      date: '2026-08-03',
      totalMinutes: 480,
      breakMinutes: 0,
      isHoliday: false,
    })
    await createLog({
      workplaceId: b.id,
      date: '2026-08-04',
      totalMinutes: 720,
      breakMinutes: 0,
      isHoliday: false,
    })

    const logs = await listLogsInMonth('2026-08')
    const groups = [a.id, b.id].map((id) => {
      const group = logs.filter((l) => l.workplaceId === id)
      return {
        workplaceId: id,
        deductionType: group[0]!.deductionSnapshot,
        insuranceFlags: group[0]!.insuranceFlagsSnapshot,
        days: group.map((l) => ({ grossPay: l.grossPay, workedMinutes: l.workedMinutes })),
      }
    })

    const summary = calculateMonthlyPay(groups, '2026-08-01')
    expect(summary.grossPay).toBe(96_000 + 161_000)
    expect(summary.byWorkplace[0]?.deductionAmount).toBe(Math.round(96_000 * 0.033))
    expect(summary.byWorkplace[1]?.deductionAmount).toBe(Math.round(161_000 * 0.049040775))
  })
})

describe('백업 / 복원', () => {
  it('내보내고 다시 가져오면 그대로 복원된다', async () => {
    const wp = await createWorkplace(draft())
    const log = await createLog({
      workplaceId: wp.id,
      date: '2026-08-24',
      totalMinutes: 720,
      breakMinutes: 0,
      isHoliday: false,
    })

    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await clearAll()
    expect(await listLogsInMonth('2026-08')).toHaveLength(0)

    const result = await importBackup(backup)
    expect(result.logs).toBe(1)

    const restored = await getDB().workLogs.get(log.id)
    expect(restored?.grossPay).toBe(161_000)
    expect(restored?.createdAt).toBe(log.createdAt)
    expect((await listWorkplaces())[0]?.name).toBe('한국공업')
  })

  it('일당노트 백업이 아니면 거부한다', async () => {
    await expect(importBackup({ format: 'other' } as never)).rejects.toThrow()
  })
})
