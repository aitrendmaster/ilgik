'use client'

import { useEffect } from 'react'

/**
 * 오프라인 동작이 이 앱의 전제다. 공장 안은 신호가 약하다.
 * 서비스워커는 앱 셸만 캐시하고, 데이터는 전부 IndexedDB에 있다.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // 개발 중에는 캐시가 오히려 방해가 된다
    if (process.env.NODE_ENV !== 'production') return

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 등록 실패해도 앱 사용을 막지 않는다
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
