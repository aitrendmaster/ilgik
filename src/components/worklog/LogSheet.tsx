'use client'

import { useEffect, useMemo, useState } from 'react'
import { BottomSheet, StepDots } from '@/components/ui/BottomSheet'
import { Toggle } from '@/components/workplace/WorkplaceSheet'
import { useSettings, useWorkplaces } from '@/lib/db/hooks'
import { colorVar, isDarkToken } from '@/lib/db/palette'
import {
  buildDayPayInput,
  createLog,
  deleteLog,
  findSameDayLogs,
  replaceLog,
  type LogDraft,
} from '@/lib/db/repo'
import type { Workplace } from '@/lib/db/schema'
import { PayrollInputError, calculateDayPay, type DayPayResult } from '@/lib/payroll'
import { formatWon, parseDateParts, splitHours } from '@/lib/format'
import { useLogSheet, useSnackbar, useWorkplaceSheet } from '@/store/ui'

type Mode = 'duration' | 'clock'
const PRESETS = [240, 480, 600, 720] as const

const SEGMENT_LABEL: Record<string, string> = {
  regular: '기본',
  overtime: '연장',
  holiday: '특근',
  holidayOver: '특근 초과',
  night: '야간',
  flat: '기본',
}

export function LogSheet() {
  const { open, date, editing, close } = useLogSheet()
  const openWorkplaceSheet = useWorkplaceSheet((s) => s.openNew)
  const showSnack = useSnackbar((s) => s.show)
  const workplaces = useWorkplaces()
  const settings = useSettings()

  const [step, setStep] = useState(1)
  const [workplaceId, setWorkplaceId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('duration')
  const [totalMinutes, setTotalMinutes] = useState(480)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [isHoliday, setIsHoliday] = useState(false)
  const [conflictIds, setConflictIds] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)

  // 시트를 열 때 초기화. 수정 모드면 원본 값을 채운다.
  useEffect(() => {
    if (!open) return
    setConflictIds(null)
    setSaving(false)
    if (editing) {
      setWorkplaceId(editing.workplaceId)
      setIsHoliday(editing.isHoliday)
      setBreakMinutes(editing.breakMinutes)
      if (editing.startTime && editing.endTime) {
        setMode('clock')
        setStartTime(editing.startTime)
        setEndTime(editing.endTime)
      } else {
        setMode('duration')
        setTotalMinutes(editing.totalMinutes ?? editing.workedMinutes)
      }
      setStep(2)
    } else {
      setWorkplaceId(null)
      setMode('duration')
      setTotalMinutes(480)
      setStartTime('09:00')
      setEndTime('18:00')
      setBreakMinutes(60)
      setIsHoliday(false)
      setStep(1)
    }
  }, [open, editing])

  const workplace = useMemo(
    () => workplaces?.find((w) => w.id === workplaceId) ?? null,
    [workplaces, workplaceId],
  )

  // 근무지를 고르면 그 곳의 기본 휴게시간을 가져온다
  useEffect(() => {
    if (workplace && !editing) setBreakMinutes(workplace.defaultBreakMinutes)
  }, [workplace, editing])

  const draft: LogDraft | null =
    workplace && date
      ? {
          workplaceId: workplace.id,
          date,
          ...(mode === 'clock'
            ? { startTime, endTime, breakMinutes }
            : // 시간만 입력 모드에서는 입력값이 곧 실근로시간이다.
              // 여기서 휴게를 또 빼면 12시간을 누른 사용자에게 11시간이 나온다.
              { totalMinutes, breakMinutes: 0 }),
          isHoliday,
        }
      : null

  let preview: DayPayResult | null = null
  let previewError: string | null = null
  if (workplace && draft && settings) {
    try {
      preview = calculateDayPay(buildDayPayInput(workplace, draft, settings.nightPayEnabled))
    } catch (e) {
      previewError =
        e instanceof PayrollInputError ? e.message : '시간을 다시 확인해주세요.'
    }
  }

  async function handleSave(force: 'add' | 'replace' | null = null) {
    if (!draft || !workplace || saving) return
    setSaving(true)
    try {
      if (editing) {
        await replaceLog(editing.id, draft)
        showSnack('바꿨어요')
        close()
        return
      }

      if (!force) {
        const same = await findSameDayLogs(workplace.id, draft.date)
        if (same.length > 0) {
          setConflictIds(same.map((l) => l.id))
          return
        }
      }

      if (force === 'replace' && conflictIds?.[0]) {
        await replaceLog(conflictIds[0], draft)
        showSnack('바꿨어요')
      } else {
        const created = await createLog(draft)
        // 되돌리기는 방금 만든 기록을 지우는 것이다
        showSnack(`${formatWon(created.grossPay)}원 저장했어요`, () => {
          void deleteLog(created.id)
        })
      }
      close()
    } finally {
      setSaving(false)
    }
  }

  if (!date) return null
  const d = parseDateParts(date)

  return (
    <BottomSheet
      open={open}
      onClose={close}
      labelledBy="log-sheet-title"
      header={
        <div>
          <div className="flex items-center justify-between gap-3 pt-1.5">
            {step === 1 ? (
              <h2 id="log-sheet-title" className="text-xl font-medium tracking-[-0.3px]">
                {d.month}월 {d.day}일 ({d.weekday})
              </h2>
            ) : (
              <h2 id="log-sheet-title" className="flex min-w-0 items-center gap-2 text-[17px] font-medium">
                <span
                  className="h-4 w-4 flex-none rounded-xs border border-ink-deep/10"
                  style={{ background: colorVar(workplace?.colorToken ?? 1) }}
                  aria-hidden="true"
                />
                <span aria-hidden="true">{workplace?.emoji}</span>
                <span className="truncate">{workplace?.name}</span>
              </h2>
            )}
            <StepDots step={step} />
          </div>
          <p className="m-0 mt-1.5 text-sm text-steel">
            {step === 1 && '어디서 일했어요?'}
            {step === 2 && '몇 시간 일했어요?'}
            {step === 3 && `${d.month}월 ${d.day}일 (${d.weekday})`}
          </p>
        </div>
      }
      footer={
        step === 1 ? null : conflictIds ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-center text-sm text-slate">
              이 날 여기서 일한 기록이 이미 있어요
            </p>
            <button
              type="button"
              onClick={() => handleSave('add')}
              className="flex h-16 w-full items-center justify-center rounded-full bg-primary text-lg font-medium text-on-primary"
            >
              따로 추가하기
            </button>
            <button
              type="button"
              onClick={() => handleSave('replace')}
              className="flex h-14 w-full items-center justify-center rounded-full border border-hairline-strong text-base font-medium"
            >
              바꾸기
            </button>
          </div>
        ) : step === 2 ? (
          <button
            type="button"
            disabled={!!previewError}
            onClick={() => setStep(3)}
            className={`flex h-16 w-full items-center justify-center rounded-full text-lg font-medium ${
              previewError ? 'bg-hairline text-muted' : 'bg-primary text-on-primary'
            }`}
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            disabled={saving || !!previewError}
            onClick={() => handleSave()}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary disabled:bg-hairline disabled:text-muted"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            저장
          </button>
        )
      }
    >
      {step === 1 && (
        <StepWorkplace
          workplaces={workplaces ?? []}
          onPick={(id) => {
            setWorkplaceId(id)
            setStep(2) // 탭 즉시 다음 스텝. 확인 버튼 없음
          }}
          onCreate={() => {
            close()
            openWorkplaceSheet(true)
          }}
        />
      )}

      {step === 2 && (
        <StepTime
          mode={mode}
          setMode={setMode}
          totalMinutes={totalMinutes}
          setTotalMinutes={setTotalMinutes}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          breakMinutes={breakMinutes}
          setBreakMinutes={setBreakMinutes}
          isHoliday={isHoliday}
          setIsHoliday={setIsHoliday}
          isUnder5={workplace?.isUnder5Employees ?? false}
          crossesMidnight={preview?.crossesMidnight ?? false}
          error={previewError}
          onBack={() => setStep(1)}
          canGoBack={!editing}
        />
      )}

      {step === 3 && preview && (
        <StepConfirm
          result={preview}
          hourlyWage={workplace?.defaultHourlyWage ?? 0}
          onBack={() => setStep(2)}
        />
      )}
    </BottomSheet>
  )
}

// ── Step 1 ────────────────────────────────────────────────────
function StepWorkplace({
  workplaces,
  onPick,
  onCreate,
}: {
  workplaces: Workplace[]
  onPick: (id: string) => void
  onCreate: () => void
}) {
  const [first, ...rest] = workplaces

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {first && <StickyCard workplace={first} wide onClick={() => onPick(first.id)} recent />}
      {rest.map((w) => (
        <StickyCard key={w.id} workplace={w} onClick={() => onPick(w.id)} />
      ))}
      <button
        type="button"
        onClick={onCreate}
        className="col-span-2 flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xxl border border-dashed border-hairline-strong text-[15px] font-medium text-steel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        새 근무지
      </button>
    </div>
  )
}

export function StickyCard({
  workplace,
  wide = false,
  recent = false,
  onClick,
}: {
  workplace: Workplace
  wide?: boolean
  recent?: boolean
  onClick: () => void
}) {
  const dark = isDarkToken(workplace.colorToken)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: colorVar(workplace.colorToken) }}
      className={`rounded-xxl p-3.5 text-left shadow-[0_4px_12px_0_rgba(5,0,56,0.06)] ${
        dark ? 'text-white' : 'text-ink'
      } ${
        wide
          ? 'col-span-2 flex min-h-[88px] flex-row items-center gap-3.5'
          : 'flex min-h-[112px] flex-col justify-between'
      }`}
    >
      <span className={wide ? 'text-4xl leading-none' : 'text-3xl leading-none'} aria-hidden="true">
        {workplace.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-medium tracking-[-0.2px] ${wide ? 'text-[19px]' : 'text-[17px]'}`}
        >
          {workplace.name}
        </span>
        <span className="tnum mt-0.5 block text-[13px] opacity-80">
          {formatWon(workplace.defaultHourlyWage)}원
        </span>
      </span>
      {recent && wide && (
        <span
          className={`flex-none rounded-full px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-wider ${
            dark ? 'bg-white/25' : 'bg-white/50'
          }`}
        >
          최근
        </span>
      )}
    </button>
  )
}

// ── Step 2 ────────────────────────────────────────────────────
function StepTime(props: {
  mode: Mode
  setMode: (m: Mode) => void
  totalMinutes: number
  setTotalMinutes: (v: number) => void
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  breakMinutes: number
  setBreakMinutes: (v: number) => void
  isHoliday: boolean
  setIsHoliday: (v: boolean) => void
  isUnder5: boolean
  crossesMidnight: boolean
  error: string | null
  onBack: () => void
  canGoBack: boolean
}) {
  const { h, m } = splitHours(props.totalMinutes)

  return (
    <>
      {props.canGoBack && (
        <button
          type="button"
          onClick={props.onBack}
          className="-mt-1 mb-0 self-start text-sm font-medium text-steel"
        >
          ← 다른 곳 고르기
        </button>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
        {(['duration', 'clock'] as const).map((m2) => (
          <button
            key={m2}
            type="button"
            aria-selected={props.mode === m2}
            role="tab"
            onClick={() => props.setMode(m2)}
            className={`h-12 rounded-full text-[15px] ${
              props.mode === m2
                ? 'bg-canvas font-semibold text-ink shadow-[0_1px_4px_rgba(5,0,56,0.12)]'
                : 'font-medium text-steel'
            }`}
          >
            {m2 === 'duration' ? '시간만 입력' : '출퇴근 시각'}
          </button>
        ))}
      </div>

      {props.mode === 'duration' ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={props.totalMinutes === minutes}
                onClick={() => props.setTotalMinutes(minutes)}
                className={`tnum h-[72px] rounded-full text-[22px] font-medium ${
                  props.totalMinutes === minutes
                    ? 'border border-primary bg-primary text-on-primary'
                    : 'border border-hairline-strong bg-canvas text-ink'
                }`}
              >
                {minutes / 60}시간
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2.5">
            <button
              type="button"
              aria-label="30분 빼기"
              onClick={() => props.setTotalMinutes(Math.max(30, props.totalMinutes - 30))}
              className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
            >
              −30분
            </button>
            <span className="tnum text-center text-lg font-semibold">
              {h}시간{m > 0 ? ` ${m}분` : ''}
            </span>
            <button
              type="button"
              aria-label="30분 더하기"
              onClick={() => props.setTotalMinutes(Math.min(1440, props.totalMinutes + 30))}
              className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
            >
              +30분
            </button>
          </div>

          <p className="m-0 text-center text-[13px] text-steel">
            쉬는 시간 빼고 <strong className="font-semibold">실제로 일한 시간</strong>이에요
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-steel">시작</span>
              <input
                type="time"
                step={300}
                value={props.startTime}
                onChange={(e) => props.setStartTime(e.target.value)}
                className="tnum h-16 rounded-md border border-hairline-strong bg-canvas px-3 text-center text-xl font-medium outline-none focus:border-brand-blue"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-steel">
                끝
                {props.crossesMidnight && (
                  <span className="rounded-full bg-featured px-2 py-[1px] text-[11px] font-semibold text-brand-blue">
                    다음날
                  </span>
                )}
              </span>
              <input
                type="time"
                step={300}
                value={props.endTime}
                onChange={(e) => props.setEndTime(e.target.value)}
                className="tnum h-16 rounded-md border border-hairline-strong bg-canvas px-3 text-center text-xl font-medium outline-none focus:border-brand-blue"
              />
            </label>
          </div>

          <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2.5">
            <button
              type="button"
              aria-label="쉬는 시간 30분 빼기"
              onClick={() => props.setBreakMinutes(Math.max(0, props.breakMinutes - 30))}
              className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
            >
              −30분
            </button>
            <span className="tnum text-center text-[15px] font-medium text-slate">
              쉬는 시간 {props.breakMinutes}분
            </span>
            <button
              type="button"
              aria-label="쉬는 시간 30분 더하기"
              onClick={() => props.setBreakMinutes(Math.min(480, props.breakMinutes + 30))}
              className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
            >
              +30분
            </button>
          </div>
        </>
      )}

      <Toggle
        label={
          <span className="flex items-center gap-2">
            <span aria-hidden="true">📅</span> 특근 · 휴일이에요
          </span>
        }
        checked={props.isHoliday}
        onChange={props.setIsHoliday}
        alert
      />

      {props.isUnder5 && (
        <p className="m-0 rounded-lg bg-surface-yellow px-3.5 py-2.5 text-[13px] font-medium leading-snug text-yellow-dark">
          같이 일하는 사람이 5명보다 적어서 1.5배 수당이 붙지 않아요
        </p>
      )}

      {props.error && (
        <p className="m-0 rounded-lg bg-coral-light px-3.5 py-2.5 text-[13px] font-medium leading-snug text-coral-dark">
          {props.error}
        </p>
      )}
    </>
  )
}

// ── Step 3 ────────────────────────────────────────────────────
function StepConfirm({
  result,
  hourlyWage,
  onBack,
}: {
  result: DayPayResult
  hourlyWage: number
  onBack: () => void
}) {
  const { h, m } = splitHours(result.workedMinutes)

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="-mt-1 self-start text-sm font-medium text-steel"
      >
        ← 시간 고치기
      </button>

      <section className="rounded-xxxl bg-surface-yellow px-5 py-6 text-center">
        <span className="inline-block rounded-full bg-coral-light px-2.5 py-1 text-[13px] font-semibold text-coral-dark">
          예상 금액이에요
        </span>
        <p className="m-0 mt-2.5 text-sm font-medium text-yellow-dark">
          {h}시간{m > 0 ? ` ${m}분` : ''} 일당
        </p>
        <p className="tnum m-0 mt-0.5 text-[56px] font-medium leading-[1.05] tracking-[-1.8px] text-ink">
          {formatWon(result.grossPay)}
          <span className="text-2xl tracking-normal">원</span>
        </p>
      </section>

      <dl className="m-0 flex flex-col gap-2">
        {result.breakdown.map((seg) => {
          const t = splitHours(seg.minutes)
          return (
            <div key={seg.label} className="flex justify-between text-sm text-slate">
              <dt className="flex items-center">
                {SEGMENT_LABEL[seg.label] ?? seg.label} {t.h}시간{t.m > 0 ? ` ${t.m}분` : ''}
                <span className="tnum ml-1.5 rounded-full bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate">
                  ×{seg.multiplier}
                </span>
              </dt>
              <dd className="tnum m-0 font-medium text-ink">{formatWon(seg.amount)}</dd>
            </div>
          )
        })}
        <div className="flex justify-between text-sm text-stone">
          <dt className="tnum">시급 {formatWon(hourlyWage)}원</dt>
          <dd className="m-0">공제는 월 정산에서</dd>
        </div>
      </dl>
    </>
  )
}
