'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
function IconPlaces() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21V8l6-4 6 4v13M15 21V11h6v10M3 21h18" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  )
}

const TABS: Array<{ href: string; key: 'home' | 'calendar' | 'workplaces' | 'settings'; icon: ReactNode }> = [
  { href: '/', key: 'home', icon: <IconHome /> },
  { href: '/calendar', key: 'calendar', icon: <IconCalendar /> },
  { href: '/workplaces', key: 'workplaces', icon: <IconPlaces /> },
  { href: '/settings', key: 'settings', icon: <IconSettings /> },
]

export function TabBar() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <nav
      className="sticky bottom-0 grid h-16 flex-none grid-cols-4 border-t border-hairline-soft bg-canvas"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('home')}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-[3px] text-[11px] ${
              active ? 'font-semibold text-ink' : 'font-medium text-stone'
            }`}
          >
            {tab.icon}
            {t(tab.key)}
          </Link>
        )
      })}
    </nav>
  )
}
