'use client'

import { useTranslations } from 'next-intl'
import { Screen } from './Screen'

/**
 * Phase 1에서 채울 화면. 빈 화면 대신 무엇이 되어 있고 무엇이 남았는지 보여준다.
 */
export function ComingSoon({
  title,
  phase,
  items,
}: {
  title: string
  phase: string
  items: string[]
}) {
  const t = useTranslations('phase')

  return (
    <Screen title={title}>
      <section className="rounded-xxxl border border-hairline-soft bg-canvas p-5">
        <span className="inline-block rounded-full bg-surface-yellow px-2.5 py-1 text-[13px] font-semibold text-yellow-dark">
          {phase}
        </span>
        <h2 className="mb-0 mt-3 text-[22px] font-medium leading-tight">{t('comingSoon')}</h2>
        <p className="mb-0 mt-2 text-sm leading-relaxed text-slate">{t('comingSoonBody')}</p>
      </section>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li
            key={item}
            className="flex min-h-14 items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-4 text-[15px] text-slate"
          >
            <span className="h-2 w-2 flex-none rounded-full bg-hairline-strong" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </Screen>
  )
}
