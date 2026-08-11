'use client'

import { useEffect } from 'react'
import { findLocale } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/useLocale'

/**
 * 선택한 언어의 폰트만 동적으로 로드한다.
 * 전 언어 폰트를 한 번에 로드하면 초기 용량이 폭발한다 —
 * 공장 안은 신호가 약하고 3G 초기 로딩 3초가 목표다.
 */
const FONT_URLS: Record<string, string> = {
  khmer:
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;500;600&display=swap',
  devanagari:
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&display=swap',
}

const FONT_STACK: Record<string, string> = {
  khmer: "'Noto Sans Khmer'",
  devanagari: "'Noto Sans Devanagari'",
}

export function LocaleFont() {
  const [locale] = useLocale()

  useEffect(() => {
    const def = findLocale(locale)
    const script = def?.font
    const root = document.documentElement

    if (!script) {
      root.style.removeProperty('--font-script')
      return
    }

    const id = `font-${script}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = FONT_URLS[script]!
      document.head.appendChild(link)
    }
    // 기본 스택 앞에 스크립트 전용 폰트를 끼운다
    root.style.setProperty('--font-script', FONT_STACK[script]!)
  }, [locale])

  return null
}
