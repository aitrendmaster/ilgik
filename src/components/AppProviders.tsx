'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { loadMessages, type Messages } from '@/lib/i18n/messages'
import { useLocale } from '@/lib/i18n/useLocale'
import koMessages from '@/messages/ko.json'

/**
 * next-intl은 클라이언트 전용 구성으로만 쓴다.
 * `/[locale]` 라우팅을 쓰지 않는 이유는 next.config.ts 주석 참고.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [locale] = useLocale()
  const [messages, setMessages] = useState<Messages>(koMessages as unknown as Messages)

  useEffect(() => {
    let cancelled = false
    loadMessages(locale).then((m) => {
      if (!cancelled) setMessages(m)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Seoul"
      now={undefined}
      onError={() => {
        // 번역 키가 비어도 앱 사용을 막지 않는다. 콘솔 소음만 줄인다.
      }}
      getMessageFallback={({ key }) => key.split('.').pop() ?? key}
    >
      {children}
    </NextIntlClientProvider>
  )
}

export { DEFAULT_LOCALE }
