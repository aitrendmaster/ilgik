import type { NextConfig } from 'next'

/**
 * 일당노트는 100% 로컬 우선(IndexedDB) 앱이라 서버 렌더가 필요 없다.
 * 정적 export로 빌드해 Vercel에서 그대로 서빙한다.
 *
 * i18n을 next-intl의 `/[locale]` 라우팅으로 하지 않는 이유는 docs 참고:
 * 정적 export 시 전 언어 × 전 페이지를 프리렌더해 번들이 폭증하고,
 * 언어 설정이 IndexedDB와 URL 두 곳에 생겨 오프라인 전환에서 충돌한다.
 * → 단일 라우트 + NextIntlClientProvider(클라이언트 전용) 구성을 쓴다.
 */
const nextConfig: NextConfig = {
  output: 'export',
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
