import type { NextConfig } from 'next'

/**
 * 일당노트는 로컬 우선(IndexedDB) 앱이다. 읽기·쓰기·계산은 전부 기기에서 하고
 * 서버는 로그인·백업·문의·관리에만 쓴다.
 *
 * i18n을 next-intl의 `/[locale]` 라우팅으로 하지 않는 이유는 docs 참고:
 * 정적 export 시 전 언어 × 전 페이지를 프리렌더해 번들이 폭증하고,
 * 언어 설정이 IndexedDB와 URL 두 곳에 생겨 오프라인 전환에서 충돌한다.
 * → 단일 라우트 + NextIntlClientProvider(클라이언트 전용) 구성을 쓴다.
 */
const nextConfig: NextConfig = {
  // 정적 export를 쓰지 않는다 — 로그인·동기화·문의·어드민에 서버가 필요하다.
  // 대신 데이터 없는 페이지는 Next가 그대로 정적 프리렌더하므로
  // 오프라인 우선 구조는 유지된다. 동적인 것은 /api/* 와 /admin 뿐이다.
  reactStrictMode: true,
  images: {
    // 정적 export에서는 이미지 최적화 서버가 없다. sharp도 사용하지 않는다.
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
