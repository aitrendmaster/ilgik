'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
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

function writeStoredLocale(locale: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // 프라이빗 모드 등에서 실패해도 앱 사용을 막지 않는다
  }
}

/**
 * ⚠️ 반드시 공유 스토어여야 한다.
 * 컴포넌트마다 useState를 따로 들면 설정 화면에서 언어를 바꿔도
 * 번역을 들고 있는 AppProviders는 그 사실을 모른다 — 화면이 안 바뀐다.
 */
interface LocaleState {
  locale: string
  hydrated: boolean
  setLocale: (next: string) => void
  hydrate: () => void
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  hydrated: false,
  setLocale: (next) => {
    if (!isSupportedLocale(next)) return
    writeStoredLocale(next)
    set({ locale: next })
  },
  hydrate: () => {
    if (get().hydrated) return
    const stored = readStoredLocale()
    const guessed = stored ?? guessLocale(navigator.languages ?? [navigator.language])
    set({ locale: guessed ?? DEFAULT_LOCALE, hydrated: true })
  },
}))

export function useLocale(): [string, (next: string) => void] {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const hydrate = useLocaleStore((s) => s.hydrate)

  // 정적 export라 첫 렌더는 기본 로케일로 프리렌더된다. 마운트 후 저장값으로 교체한다.
  useEffect(() => {
    hydrate()
  }, [hydrate])

  return [locale, setLocale]
}
