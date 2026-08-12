'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Screen } from '@/components/Screen'
import { Toggle } from '@/components/workplace/WorkplaceSheet'
import { useSettings } from '@/lib/db/hooks'
import { exportBackup, importBackup, updateSettings } from '@/lib/db/repo'
import { LOCALES } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/useLocale'
import { useSnackbar } from '@/store/ui'
import { CompanyBlock } from '@/components/legal/LegalPage'

export default function SettingsPage() {
  const t = useTranslations('common')
  const tLegal = useTranslations('legal')
  const [locale, setLocale] = useLocale()
  const settings = useSettings()
  const showSnack = useSnackbar((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: session, status } = useSession()

  async function handleExport() {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ilgik-backup-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showSnack(`기록 ${backup.workLogs.length}개를 내보냈어요`)
  }

  async function handleImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const { logs } = await importBackup(parsed)
      showSnack(`기록 ${logs}개를 가져왔어요`)
    } catch {
      showSnack('가져오지 못했어요. 일당노트 백업 파일이 맞는지 확인해주세요')
    }
  }

  return (
    <Screen title={t('settings')}>
      {/* 언어 */}
      <p className="mb-[-4px] text-[13px] font-semibold text-steel">언어 · Language</p>
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
                {!l.reviewed && (
                  <span className="flex-none rounded-full bg-surface-yellow px-2.5 py-1 text-[13px] font-semibold text-yellow-dark">
                    검수중
                  </span>
                )}
                {selected && (
                  <svg className="flex-none text-brand-blue" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-center text-xs text-stone">
        미검수 언어를 고르면 아래 안내는 영어로 표시됩니다
      </p>

      {/* 야간수당 */}
      <p className="mb-[-4px] mt-2 text-[13px] font-semibold text-steel">밤에 일한 돈</p>
      <Toggle
        label="밤 10시~아침 6시 수당 계산하기"
        checked={settings?.nightPayEnabled ?? false}
        onChange={(v) => void updateSettings({ nightPayEnabled: v })}
      />
      <p className="m-0 text-[12.5px] leading-snug text-steel">
        출퇴근 시각을 넣을 때만 계산해요. 시간만 넣으면 밤 시간을 알 수 없어요.
      </p>

      {/* 계정 — "로그인"이라 부르지 않는다. 사용자에게 필요한 건 기록을 지키는 것이다 */}
      <p className="mb-[-4px] mt-2 text-[13px] font-semibold text-steel">내 계정</p>
      {status === 'authenticated' && session?.user ? (
        <div className="flex flex-col gap-2">
          <div className="flex min-h-14 items-center gap-3 rounded-lg border border-hairline-soft bg-canvas px-4">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-teal-light text-sm font-semibold text-moss-dark">
              {(session.user.name ?? session.user.email ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
              {session.user.email}
            </span>
          </div>
          {session.user.isAdmin && (
            <Link
              href="/admin"
              className="flex min-h-14 items-center rounded-lg border border-hairline-soft bg-canvas px-4 text-[15px] font-medium"
            >
              관리자 화면
            </Link>
          )}
          <button
            type="button"
            onClick={() => void signOut({ redirectTo: '/' })}
            className="flex h-14 w-full items-center justify-center rounded-full border border-hairline-strong bg-canvas text-base font-medium"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-full bg-primary py-3 text-center text-on-primary"
        >
          <span className="text-lg font-medium">기록 지키기</span>
          <span className="text-[13px] opacity-75">휴대폰을 바꿔도 기록이 남아요</span>
        </Link>
      )}

      {/* 백업 — 기기 분실 = 증거 전소를 막는 최소 장치 */}
      <p className="mb-[-4px] mt-2 text-[13px] font-semibold text-steel">기록 지키기</p>
      <button
        type="button"
        onClick={handleExport}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline-strong bg-canvas text-base font-medium"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M8 8l4-4 4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        파일로 내보내기
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline-strong bg-canvas text-base font-medium"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v12M8 12l4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        파일에서 가져오기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImport(file)
          e.target.value = ''
        }}
      />
      <p className="m-0 text-[12.5px] leading-snug text-steel">
        휴대폰을 잃어버려도 기록이 남습니다. 가끔 내보내서 보관하세요.
      </p>

      {/* 법적 고지 */}
      <section className="mt-2 flex flex-col gap-2.5 rounded-xl bg-surface p-4 text-[13px] leading-relaxed text-slate">
        <p className="m-0">{tLegal('disclaimer')}</p>
        <p className="m-0">{tLegal('under5')}</p>
        <p className="m-0">{tLegal('weeklyRest')}</p>
        <p className="m-0">{tLegal('report', { tel: '1350' })}</p>
      </section>

      {/* 약관·방침·문의 */}
      <p className="mb-[-4px] mt-2 text-[13px] font-semibold text-steel">서비스 정보</p>
      <nav className="flex flex-col gap-2">
        {[
          { href: '/support', label: '문의하기' },
          { href: '/legal/terms', label: '이용약관' },
          { href: '/legal/privacy', label: '개인정보 처리방침' },
          { href: '/legal/data-deletion', label: '데이터 삭제' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 items-center rounded-lg border border-hairline-soft bg-canvas px-4 text-[15px] font-medium text-ink"
          >
            {item.label}
            <svg className="ml-auto text-stone" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </nav>

      <CompanyBlock />
    </Screen>
  )
}
