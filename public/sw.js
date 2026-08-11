/* 일당노트 서비스워커 — 앱 셸 캐싱
 *
 * 데이터는 전부 IndexedDB에 있으므로 여기서는 셸만 다룬다.
 * 오프라인(비행기 모드)에서 기록 입력·조회·계산이 전부 되어야 한다.
 *
 * 전략
 *  - 내비게이션: network-first → 실패하면 캐시된 셸
 *  - 정적 자산(_next/static, icons): cache-first (해시가 붙어 불변)
 *  - 그 외 교차 출처(폰트 CDN): stale-while-revalidate
 */

const VERSION = 'v1'
const SHELL_CACHE = `ilgik-shell-${VERSION}`
const ASSET_CACHE = `ilgik-asset-${VERSION}`

const SHELL_URLS = ['/', '/calendar', '/workplaces', '/settings', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ilgik-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // 내비게이션 — network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/')),
        ),
    )
    return
  }

  // 정적 자산 — cache-first
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  // 폰트 CDN 등 교차 출처 — stale-while-revalidate
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok || response.type === 'opaque') {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
