'use client'

import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { BreakPicker } from '@/components/worklog/BreakPicker'
import { OtherDeductionFields } from './OtherDeductionFields'
import { COLOR_TOKENS, EMOJIS, colorVar, isDarkToken } from '@/lib/db/palette'
import { archiveWorkplace, createWorkplace, updateWorkplace } from '@/lib/db/repo'
import { useWorkplace, useWorkplaces } from '@/lib/db/hooks'
import { insuranceRateFor, minimumWageAt } from '@/lib/payroll'
import type { DeductionType, InsuranceFlags, OtherDeduction } from '@/lib/payroll'
import { formatRate, formatWon } from '@/lib/format'
import { todayISO } from '@/lib/db/repo'
import { useLogSheet, useSnackbar, useWorkplaceSheet } from '@/store/ui'
import { pickColorToken, pickEmoji } from '@/lib/db/palette'

/**
 * 앱에서 유일하게 복잡해도 되는 화면이다.
 * 한 번 설정하면 이후 기록이 3탭으로 끝나기 때문.
 * 대신 전문 용어는 전부 사용자가 실제로 겪는 상황으로 바꾼다.
 */

const DEDUCTION_OPTIONS: Array<{ value: DeductionType; title: string; desc: string }> = [
  { value: 'RATE_3_3', title: '3.3% 떼는 곳', desc: '인력사무소 · 일용직. 4대보험 없음' },
  { value: 'DAILY_WORKER', title: '일용직으로 신고하는 곳', desc: '하루 15만원 아래면 세금이 없어요' },
  { value: 'INSURANCE_4', title: '4대보험 내는 곳', desc: '정식 근로계약' },
  { value: 'NONE', title: '전액 받는 곳', desc: '현금 지급, 떼는 것 없음' },
]

interface FormState {
  name: string
  colorToken: number
  emoji: string
  hourlyWage: string
  deductionType: DeductionType
  insuranceFlags: InsuranceFlags
  isUnder5Employees: boolean
  defaultBreakMinutes: number
  payDayOfMonth: string
  otherDeductions: OtherDeduction[]
}

function emptyForm(colorToken: number, emoji: string): FormState {
  return {
    name: '',
    colorToken,
    emoji,
    hourlyWage: String(minimumWageAt(todayISO())),
    deductionType: 'RATE_3_3',
    insuranceFlags: { pension: true, health: true, employment: true },
    isUnder5Employees: false,
    defaultBreakMinutes: 60,
    payDayOfMonth: '',
    otherDeductions: [],
  }
}

export function WorkplaceSheet() {
  const { open, editingId, continueToLog, close } = useWorkplaceSheet()
  const openLogSheet = useLogSheet((s) => s.openSheet)
  const showSnack = useSnackbar((s) => s.show)
  const existing = useWorkplace(editingId)
  const all = useWorkplaces(true)

  const [form, setForm] = useState<FormState>(() => emptyForm(1, EMOJIS[0]))
  const [saving, setSaving] = useState(false)

  /**
   * 시트를 열 때 딱 한 번만 초기화한다.
   *
   * 의존성에 existing/all(liveQuery 결과)을 그대로 넣으면, 배경에서 아무 DB 쓰기가
   * 일어나도 배열 identity가 바뀌어 이 effect가 다시 돌고 입력 중이던 값이 지워진다.
   */
  const initializedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      initializedFor.current = null
      return
    }
    const key = editingId ?? 'new'
    if (initializedFor.current === key) return

    if (editingId) {
      if (!existing) return // 조회가 끝난 뒤에 채운다
      initializedFor.current = key
      setForm({
        name: existing.name,
        colorToken: existing.colorToken,
        emoji: existing.emoji,
        hourlyWage: String(existing.defaultHourlyWage),
        deductionType: existing.deductionType,
        insuranceFlags: existing.insuranceFlags ?? {
          pension: true,
          health: true,
          employment: true,
        },
        isUnder5Employees: existing.isUnder5Employees,
        defaultBreakMinutes: existing.defaultBreakMinutes,
        payDayOfMonth: existing.payDayOfMonth ? String(existing.payDayOfMonth) : '',
        otherDeductions: existing.otherDeductions ?? [],
      })
    } else {
      if (!all) return
      initializedFor.current = key
      setForm(
        emptyForm(
          pickColorToken(all.map((w) => w.colorToken)),
          pickEmoji(all.map((w) => w.emoji)),
        ),
      )
    }
  }, [open, editingId, existing, all])

  const wage = Number(form.hourlyWage.replace(/[^0-9]/g, '')) || 0
  const minWage = minimumWageAt(todayISO())
  const belowMinimum = wage > 0 && wage < minWage

  const rate =
    form.deductionType === 'INSURANCE_4'
      ? insuranceRateFor(form.insuranceFlags, todayISO())
      : form.deductionType === 'RATE_3_3'
        ? 0.033
        : 0

  const canSave = form.name.trim().length > 0 && wage > 0 && !saving

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        colorToken: form.colorToken,
        emoji: form.emoji,
        defaultHourlyWage: wage,
        defaultBreakMinutes: form.defaultBreakMinutes,
        deductionType: form.deductionType,
        insuranceFlags:
          form.deductionType === 'INSURANCE_4' ? form.insuranceFlags : undefined,
        isUnder5Employees: form.isUnder5Employees,
        otherDeductions: form.otherDeductions,
        payDayOfMonth: form.payDayOfMonth ? Number(form.payDayOfMonth) : undefined,
      }

      if (editingId) {
        await updateWorkplace(editingId, payload)
        showSnack('바꿨어요')
      } else {
        await createWorkplace(payload)
        // 바로 기록 입력으로 이어질 때는 토스트를 띄우지 않는다
        if (!continueToLog) showSnack('만들었어요')
      }
      close()
      if (continueToLog) openLogSheet(todayISO())
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!editingId) return
    await archiveWorkplace(editingId, true)
    showSnack('보관했어요. 지난 기록은 그대로 있어요', async () => {
      await archiveWorkplace(editingId, false)
    })
    close()
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      labelledBy="workplace-sheet-title"
      header={
        <h2 id="workplace-sheet-title" className="text-xl font-medium tracking-[-0.3px]">
          {editingId ? '일하는 곳 고치기' : '일하는 곳 만들기'}
        </h2>
      }
      footer={
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className={`flex h-16 w-full items-center justify-center rounded-full text-lg font-medium ${
            canSave ? 'bg-primary text-on-primary' : 'bg-hairline text-muted'
          }`}
        >
          저장
        </button>
      }
    >
      {/* 이름 */}
      <Field label="이름">
        <input
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="예: 한국공업"
          className="h-14 w-full rounded-md border border-hairline-strong bg-canvas px-4 text-[17px] font-medium outline-none focus:border-brand-blue"
        />
      </Field>

      {/* 색·그림 — 자동 배정되고 바꿀 수도 있다 */}
      <Field label="색깔과 그림">
        <div className="flex items-center gap-3.5">
          <span
            className={`grid h-14 w-14 flex-none place-items-center rounded-xxl text-[26px] shadow-[0_4px_12px_0_rgba(5,0,56,0.06)] ${
              isDarkToken(form.colorToken) ? 'text-white' : 'text-ink'
            }`}
            style={{ background: colorVar(form.colorToken) }}
            aria-hidden="true"
          >
            {form.emoji}
          </span>
          <div className="flex flex-wrap gap-2">
            {COLOR_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                aria-label={`색 ${token}`}
                aria-pressed={form.colorToken === token}
                onClick={() => patch({ colorToken: token })}
                className={`h-9 w-9 rounded-md border border-ink-deep/10 ${
                  form.colorToken === token ? 'outline outline-2 outline-offset-2 outline-primary' : ''
                }`}
                style={{ background: colorVar(token) }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={e}
              aria-pressed={form.emoji === e}
              onClick={() => patch({ emoji: e })}
              className={`grid h-11 w-11 place-items-center rounded-md text-xl ${
                form.emoji === e ? 'bg-featured outline outline-2 outline-brand-blue' : 'bg-surface'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>

      {/* 시급 */}
      <Field label="1시간에 받는 돈">
        <div className="flex h-14 items-center rounded-md border border-hairline-strong bg-canvas px-4">
          <input
            inputMode="numeric"
            value={form.hourlyWage}
            onChange={(e) => patch({ hourlyWage: e.target.value.replace(/[^0-9]/g, '') })}
            className="tnum w-full bg-transparent text-[17px] font-medium outline-none"
          />
          <span className="ml-auto flex-none text-sm text-steel">원</span>
        </div>
        {belowMinimum && (
          <p className="m-0 rounded-lg bg-coral-light px-3 py-2 text-[13px] font-medium leading-snug text-coral-dark">
            올해 최저임금은 {formatWon(minWage)}원이에요. 더 적게 받고 있다면 신고할 수 있어요.
          </p>
        )}
      </Field>

      {/* 공제 방식 */}
      <Field label="돈을 어떻게 받아요?">
        {DEDUCTION_OPTIONS.map((opt) => (
          <div key={opt.value}>
            <button
              type="button"
              role="radio"
              aria-checked={form.deductionType === opt.value}
              onClick={() => patch({ deductionType: opt.value })}
              className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${
                form.deductionType === opt.value
                  ? 'border-2 border-brand-blue bg-featured'
                  : 'border border-hairline bg-canvas'
              }`}
            >
              <span
                className={`h-[22px] w-[22px] flex-none rounded-full bg-white ${
                  form.deductionType === opt.value
                    ? 'border-[7px] border-brand-blue'
                    : 'border border-hairline-strong'
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-base font-medium leading-tight">{opt.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-steel">{opt.desc}</span>
              </span>
            </button>

            {/* 국민연금은 상호주의라 국적에 따라 안 떼는 경우가 있고, E-9은 고용보험도
                임의가입이다. 9.4% 일괄 적용은 최대 사용자군에서 틀린다.
                국적 판정을 앱이 하지 않고 급여명세서를 보고 체크하게 한다. */}
            {opt.value === 'INSURANCE_4' && form.deductionType === 'INSURANCE_4' && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-xl bg-surface p-3.5">
                <InsuranceCheck
                  label="국민연금 떼요"
                  checked={form.insuranceFlags.pension}
                  onChange={(v) =>
                    patch({ insuranceFlags: { ...form.insuranceFlags, pension: v } })
                  }
                />
                <InsuranceCheck
                  label="건강보험 떼요"
                  checked={form.insuranceFlags.health}
                  onChange={(v) => patch({ insuranceFlags: { ...form.insuranceFlags, health: v } })}
                />
                <InsuranceCheck
                  label="고용보험 떼요"
                  checked={form.insuranceFlags.employment}
                  onChange={(v) =>
                    patch({ insuranceFlags: { ...form.insuranceFlags, employment: v } })
                  }
                  badge={formatRate(rate)}
                />
                <p className="m-0 pt-1 text-[12.5px] leading-snug text-steel">
                  급여명세서를 보고 실제로 떼는 것만 체크하세요
                </p>
              </div>
            )}
          </div>
        ))}
      </Field>

      {/* 5인 미만 */}
      <Field label="일하는 사람 수">
        <Toggle
          label="같이 일하는 사람이 5명보다 적어요"
          checked={form.isUnder5Employees}
          onChange={(v) => patch({ isUnder5Employees: v })}
        />
        <p className="m-0 text-[12.5px] leading-snug text-steel">
          켜면 1.5배 · 2배 수당이 붙지 않아요
        </p>
      </Field>

      {/* 휴게시간 */}
      <Field label="보통 쉬는 시간">
        <BreakPicker
          value={form.defaultBreakMinutes}
          onChange={(v) => patch({ defaultBreakMinutes: v })}
        />
        <p className="m-0 text-[12.5px] leading-snug text-steel">
          기록할 때 이 값이 먼저 들어가요. 그날그날 바꿀 수 있어요.
          출퇴근 시각을 넣을 때만 빼고, 시간만 넣을 때는 빼지 않아요.
        </p>
      </Field>

      {/* 기타 공제 — 실제로 봉투에서 빠지는 것들 */}
      <Field label="따로 떼는 돈 (없으면 비워두세요)">
        <OtherDeductionFields
          items={form.otherDeductions}
          onChange={(next) => patch({ otherDeductions: next })}
          hourlyWage={wage}
        />
      </Field>

      {/* 지급일 */}
      <Field label="돈 받는 날 (몰라도 괜찮아요)">
        <div className="flex h-14 items-center rounded-md border border-hairline-strong bg-canvas px-4">
          <span className="text-sm text-steel">다음 달</span>
          <input
            inputMode="numeric"
            value={form.payDayOfMonth}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
              const n = Number(v)
              patch({ payDayOfMonth: v === '' || (n >= 1 && n <= 31) ? v : form.payDayOfMonth })
            }}
            placeholder="10"
            className="tnum mx-2 w-12 bg-transparent text-center text-[17px] font-medium outline-none"
          />
          <span className="text-sm text-steel">일</span>
        </div>
      </Field>

      {/* 삭제가 아니라 보관이다. 삭제하면 지난 기록의 참조가 깨진다 */}
      {editingId && (
        <button
          type="button"
          onClick={handleArchive}
          className="mt-1 flex h-14 w-full items-center justify-center rounded-full border border-hairline-strong text-base font-medium text-slate"
        >
          이제 여기 안 나가요 (보관)
        </button>
      )}
    </BottomSheet>
  )
}

// ── 폼 프리미티브 ──────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-steel">{label}</span>
      {children}
    </div>
  )
}

function InsuranceCheck({
  label,
  checked,
  onChange,
  badge,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  badge?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center gap-2.5 text-[15px] font-medium"
    >
      <span
        className={`grid h-6 w-6 flex-none place-items-center rounded-sm ${
          checked ? 'border border-primary bg-primary text-white' : 'border border-hairline-strong bg-white'
        }`}
        aria-hidden="true"
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
      {badge && (
        <span className="tnum ml-auto rounded-full bg-surface-yellow px-2.5 py-0.5 font-mono text-[13px] font-semibold text-yellow-dark">
          {badge}
        </span>
      )}
    </button>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  alert = false,
}: {
  label: React.ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  alert?: boolean
}) {
  const on = checked && alert
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-15 w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[15px] font-medium ${
        on ? 'border border-transparent bg-coral-light text-coral-dark' : 'border border-hairline bg-canvas'
      }`}
    >
      {label}
      <span
        className={`relative ml-auto h-8 w-[52px] flex-none rounded-full transition-colors ${
          checked ? (alert ? 'bg-coral-dark' : 'bg-primary') : 'bg-hairline-strong'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow transition-all ${
            checked ? 'left-[23px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  )
}

export function Stepper({
  value,
  step,
  min,
  max,
  onChange,
  format,
}: {
  value: number
  step: number
  min: number
  max: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2.5">
      <button
        type="button"
        aria-label={`${step}분 빼기`}
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
      >
        −{step}
      </button>
      <span className="tnum text-center text-lg font-semibold">{format(value)}</span>
      <button
        type="button"
        aria-label={`${step}분 더하기`}
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-14 rounded-full border border-hairline-strong bg-canvas text-lg font-medium"
      >
        +{step}
      </button>
    </div>
  )
}
