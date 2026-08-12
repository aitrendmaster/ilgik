'use client'

import { useEffect, useState } from 'react'

/**
 * 비로그인(게스트) 이용 기간.
 *
 * 가입 전에는 30일까지 기록할 수 있고, 그 뒤 새 기록을 남기려면 로그인이 필요하다.
 *
 * ⚠️ 기간이 지나도 이미 남긴 기록은 계속 보고, 고치고, 파일로 내보낼 수 있다.
 * 이 앱의 핵심 가치가 "체불 증거"인데 그 증거를 인질로 잡으면 제품이 스스로를 배신한다.
 * 잠기는 것은 "새 기록 추가"뿐이다.
 */
export const GUEST_RETENTION_DAYS = 30

const STORAGE_KEY = 'ilgik.guestStartedAt'
const DAY_MS = 24 * 60 * 60 * 1000

function readStart(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** 첫 사용 시각을 기록한다. 이미 있으면 그대로 둔다 */
export function markGuestStart(): number {
  const existing = readStart()
  if (existing !== null) return existing
  const now = Date.now()
  try {
    window.localStorage.setItem(STORAGE_KEY, String(now))
  } catch {
    // 저장 실패 시에는 제한하지 않는다. 막는 쪽으로 실패하지 않는다
  }
  return now
}

export function clearGuestStart(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}

export interface GuestStatus {
  /** 아직 판단 전 (서버 렌더 또는 마운트 직후) */
  loading: boolean
  signedIn: boolean
  daysUsed: number
  daysLeft: number
  /** 새 기록을 남길 수 있는지 */
  canRecord: boolean
  /** 곧 만료 — 안내를 띄울 시점 */
  warning: boolean
}

export function useGuestStatus(signedIn: boolean): GuestStatus {
  const [start, setStart] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setStart(markGuestStart())
    setReady(true)
  }, [])

  if (!ready || start === null) {
    return {
      loading: true,
      signedIn,
      daysUsed: 0,
      daysLeft: GUEST_RETENTION_DAYS,
      canRecord: true,
      warning: false,
    }
  }

  const daysUsed = Math.floor((Date.now() - start) / DAY_MS)
  const daysLeft = Math.max(0, GUEST_RETENTION_DAYS - daysUsed)

  return {
    loading: false,
    signedIn,
    daysUsed,
    daysLeft,
    canRecord: signedIn || daysLeft > 0,
    warning: !signedIn && daysLeft <= 7,
  }
}
