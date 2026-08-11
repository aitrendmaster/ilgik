'use client'

import { useTranslations } from 'next-intl'
import { Screen } from '@/components/Screen'
import { LOCALES } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/useLocale'

export default function SettingsPage() {
  const t = useTranslations('common')
  const tLegal = useTranslations('legal')
  const [locale, setLocale] = useLocale()

  return (
    <Screen title={t('settings')}>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {LOCALES.map((l) => {
          const selected = l.code === locale
          return (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => setLocale(l.code)}
                aria-pressed={selected}
                className={`flex min-h-[68px] w-full items-center gap-3.5 rounded-full px-5 text-left text-xl font-medium text-ink ${
                  selected
                    ? 'border-2 border-brand-blue bg-featured'
                    : 'border border-hairline bg-canvas'
                }`}
              >
                <span className="flex-none text-[28px] leading-none" aria-hidden="true">
                  {l.flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.nativeName}</span>

                {/* 검수 게이트 — 미검수 언어는 배지를 달고 법률·금액 문구를 영어로 노출한다 */}
                {!l.reviewed && (
                  <span className="flex-none rounded-full bg-surface-yellow px-2.5 py-1 text-[13px] font-semibold text-yellow-dark">
                    검수중
                  </span>
                )}
                {selected && (
                  <svg
                    className="flex-none text-brand-blue"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <section className="mt-1 flex flex-col gap-2.5 rounded-xl bg-surface p-4 text-[13px] leading-relaxed text-slate">
        <p className="m-0">{tLegal('disclaimer')}</p>
        <p className="m-0">{tLegal('under5')}</p>
        <p className="m-0">{tLegal('weeklyRest')}</p>
        <p className="m-0">
          {tLegal('report', { tel: '1350' })}
        </p>
      </section>

      <p className="mt-1 text-center text-xs text-stone">
        미검수 언어를 고르면 위 안내는 영어로 표시됩니다
      </p>
    </Screen>
  )
}
