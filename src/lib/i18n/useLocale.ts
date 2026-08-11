'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_LOCALE, guessLocale, isSupportedLocale } from './config'

const STORAGE_KEY = 'ilgik.locale'

/**
 * 로케일은 localStorage에 둔다. IndexedDB는 비동기라 첫 페인트 전에 읽을 수 없어
 * 언어가 한 번 깜빡인다. Phase 1-B에서 Dexie settings로 미러링한다.
 */
export function readStoredLocale(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v && isSupportedLocale(v) ? v : null
  } catch {
    return null
  }
}

export function writeStoredLocale(locale: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // 프라이빗 모드 등에서 실패해도 앱 사용을 막지 않는다
  }
}

export function useLocale(): [string, (next: string) => void] {
  // 정적 export라 서버에서는 기본 로케일로 프리렌더되고, 마운트 후 저장값으로 교체된다.
  const [locale, setLocale] = useState(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = readStoredLocale()
    if (stored) {
      setLocale(stored)
      return
    }
    const guessed = guessLocale(navigator.languages ?? [navigator.language])
    if (guessed) setLocale(guessed)
  }, [])

  const update = (next: string) => {
    if (!isSupportedLocale(next)) return
    writeStoredLocale(next)
    setLocale(next)
  }

  return [locale, update]
}
