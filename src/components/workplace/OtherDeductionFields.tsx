'use client'

import type { OtherDeduction, OtherDeductionMode, OtherDeductionType } from '@/lib/payroll'
import { formatWon } from '@/lib/format'

/**
 * 소개비·숙소비 같은 실제 공제.
 *
 * 인력사무소는 일당의 8~10%를 소개비로 뗀다. 이게 빠지면 앱이 계산한 실수령이
 * 실제 봉투보다 높게 나오고, 사용자는 앱이 틀렸다고 판단한다.
 *
 * 항목을 자유롭게 추가하는 UI는 저문해 사용자에게 과하다.
 * 실제로 흔한 네 가지를 고정 행으로 두고 금액만 넣게 한다.
 */
const ROWS: Array<{ type: OtherDeductionType; label: string; hint: string }> = [
  { type: 'AGENCY_FEE', label: '소개비', hint: '인력사무소에 주는 돈' },
  { type: 'DORM', label: '숙소비', hint: '기숙사·방값' },
  { type: 'MEAL', label: '밥값', hint: '회사가 떼는 식대' },
  { type: 'TRANSPORT', label: '차비', hint: '출퇴근 차량비' },
]

const MODES: Array<{ mode: OtherDeductionMode; label: string }> = [
  { mode: 'PER_DAY', label: '하루에' },
  { mode: 'PER_MONTH', label: '한 달에' },
  { mode: 'RATE', label: '%로' },
]

function find(items: OtherDeduction[], type: OtherDeductionType): OtherDeduction | undefined {
  return items.find((d) => d.type === type)
}

export function OtherDeductionFields({
  items,
  onChange,
  hourlyWage,
}: {
  items: OtherDeduction[]
  onChange: (next: OtherDeduction[]) => void
  hourlyWage: number
}) {
  function update(type: OtherDeductionType, label: string, patch: Partial<OtherDeduction>) {
    const existing = find(items, type)
    const merged: OtherDeduction = {
      type,
      label,
      mode: existing?.mode ?? 'PER_DAY',
      value: existing?.value ?? 0,
      ...patch,
    }
    const rest = items.filter((d) => d.type !== type)
    onChange(merged.value > 0 ? [...rest, merged] : rest)
  }

  const active = items.filter((d) => d.value > 0)

  return (
    <div className="flex flex-col gap-2.5">
      {ROWS.map((row) => {
        const current = find(items, row.type)
        const mode = current?.mode ?? 'PER_DAY'
        // RATE는 0~1로 저장하고 화면에는 퍼센트로 보여준다
        const shown = current ? (mode === 'RATE' ? current.value * 100 : current.value) : ''

        return (
          <div key={row.type} className="rounded-xl border border-hairline bg-canvas p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-medium">{row.label}</span>
              <span className="text-[12.5px] text-steel">{row.hint}</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-12 flex-1 items-center rounded-md border border-hairline-strong px-3">
                <input
                  inputMode="numeric"
                  aria-label={`${row.label} 금액`}
                  value={shown === '' ? '' : String(shown)}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '')
                    const num = Number(raw) || 0
                    update(row.type, row.label, {
                      value: mode === 'RATE' ? num / 100 : Math.round(num),
                    })
                  }}
                  className="tnum w-full bg-transparent text-[16px] font-medium outline-none"
                />
                <span className="ml-auto flex-none text-[13px] text-steel">
                  {mode === 'RATE' ? '%' : '원'}
                </span>
              </div>

              <div className="flex flex-none gap-1 rounded-full bg-surface p-1">
                {MODES.map((m) => (
                  <button
                    key={m.mode}
                    type="button"
                    aria-label={`${row.label} ${m.label}`}
                    aria-pressed={mode === m.mode}
                    onClick={() => {
                      // 단위가 바뀌면 값의 의미가 달라진다. 헷갈리지 않게 0으로 되돌린다
                      update(row.type, row.label, { mode: m.mode, value: 0 })
                    }}
                    className={`h-10 rounded-full px-2.5 text-[12.5px] ${
                      mode === m.mode
                        ? 'bg-canvas font-semibold text-ink shadow-[0_1px_4px_rgba(5,0,56,0.12)]'
                        : 'font-medium text-steel'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {active.length > 0 && (
        <p className="m-0 rounded-xl bg-surface-yellow px-3.5 py-2.5 text-[12.5px] leading-relaxed text-yellow-dark">
          {active.map((d) => d.label).join(' · ')}를 뺀 금액이 월 정산에 나와요.
          {active.some((d) => d.type === 'AGENCY_FEE') && (
            <>
              {' '}
              <strong className="font-semibold">
                소개비를 떼는 것이 법에 맞는지는 따로 확인이 필요해요.
              </strong>{' '}
              임금은 전액 지급하는 것이 원칙이에요.
            </>
          )}
        </p>
      )}

      {hourlyWage > 0 && find(items, 'AGENCY_FEE')?.mode === 'PER_DAY' && (
        <p className="m-0 text-[12.5px] text-steel">
          참고 — 8시간 일당은 {formatWon(hourlyWage * 8)}원이에요
        </p>
      )}
    </div>
  )
}
