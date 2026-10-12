'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { COMPANY, POLICY_EFFECTIVE_DATE } from '@/lib/company'

/**
 * 약관·방침 공통 레이아웃.
 * 이 화면들은 저문해 사용자가 읽는 화면이 아니라 법적 표시 의무를 위한 것이라
 * 앱의 다른 화면과 달리 문장이 길어도 된다. 대신 요약을 맨 위에 둔다.
 */
export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface">
      <header
        className="flex flex-none items-center gap-2 px-4 pb-3 pt-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <Link
          href="/settings"
          aria-label="뒤로"
          className="grid h-11 w-11 flex-none place-items-center rounded-full border border-hairline bg-canvas"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-[22px] font-medium tracking-[-0.3px]">{title}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 pb-10">
        <p className="m-0 rounded-xl bg-surface-yellow px-4 py-3 text-[14px] leading-relaxed text-yellow-dark">
          {summary}
        </p>

        <div className="flex flex-col gap-5 rounded-xxxl border border-hairline-soft bg-canvas p-5 text-[14px] leading-relaxed text-slate [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>

        <p className="m-0 text-center text-xs text-stone">시행일 {POLICY_EFFECTIVE_DATE}</p>
        <CompanyBlock />
      </main>
    </div>
  )
}

export function CompanyBlock() {
  return (
    <section className="rounded-xl bg-canvas p-4 text-[12.5px] leading-relaxed text-steel">
      <p className="m-0 font-semibold text-ink">
        {COMPANY.nameKo} <span className="font-normal text-steel">({COMPANY.nameEn})</span>
      </p>
      <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt>대표자</dt>
        <dd className="m-0">{COMPANY.ceo}</dd>
        <dt>사업자등록번호</dt>
        <dd className="tnum m-0">{COMPANY.businessNumber}</dd>
        <dt>통신판매업</dt>
        <dd className="tnum m-0">{COMPANY.mailOrderNumber}</dd>
        <dt>주소</dt>
        <dd className="m-0">{COMPANY.address}</dd>
      </dl>
    </section>
  )
}
