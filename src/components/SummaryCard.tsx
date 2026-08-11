'use client'

import { useTranslations } from 'next-intl'
import { formatSigned, formatWon } from '@/lib/format'

/**
 * 정산 카드 — 기획서의 급여봉투 카드를 DESIGN-ILGIK 규격으로 옮긴 것.
 * card-feature(canvas + rounded.xxxl + hairline-soft, 그림자 없음)를 쓰고,
 * 봉투 정체성은 1px dashed 절취선 한 줄로만 남긴다.
 * 종이 노이즈와 도장 스탬프는 flat 원칙과 충돌해 제거하고
 * "예상" 고지는 badge-tag-coral pill로 대체했다.
 */
export function SummaryCard({
  netPay,
  grossPay,
  deduction,
  showEstimateBadge = true,
}: {
  netPay: number
  grossPay: number
  deduction: number
  showEstimateBadge?: boolean
}) {
  const t = useTranslations('home')
  const tLegal = useTranslations('legal')

  return (
    <section className="relative rounded-xxxl border border-hairline-soft bg-canvas p-5">
      {showEstimateBadge && (
        <span className="absolute right-4 top-4 rounded-full bg-coral-light px-2.5 py-1 text-[13px] font-semibold leading-tight text-coral-dark">
          {tLegal('estimate')}
        </span>
      )}

      <p className="m-0 text-sm font-medium text-steel">{t('netLabel')}</p>
      <p className="tnum m-0 mt-1 text-[48px] font-medium leading-[1.1] tracking-[-1.5px] text-success">
        {formatWon(netPay)}
        <span className="text-[22px] tracking-normal">원</span>
      </p>

      {/* 절취선 — 카드 폭 전체로 확장 */}
      <div className="-mx-5 my-4 border-t border-dashed border-hairline-strong" />

      <dl className="m-0 flex flex-col gap-1.5">
        <div className="flex justify-between text-sm text-slate">
          <dt>{t('gross')}</dt>
          <dd className="tnum m-0 font-medium text-ink">{formatWon(grossPay)}원</dd>
        </div>
        <div className="flex justify-between text-sm text-slate">
          <dt>{t('deduction')}</dt>
          <dd className="tnum m-0 font-medium text-coral-dark">{formatSigned(deduction)}원</dd>
        </div>
      </dl>
    </section>
  )
}
