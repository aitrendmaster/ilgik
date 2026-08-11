/**
 * Phase 1 로케일 6종.
 *
 * 원본 개발명령서의 11개 언어(ja·hi·kk·lo 포함)는 국내 체류 근로자 구성과
 * 맞지 않았다. E-9 고용허가제 송출국 기준으로 재배치하고, 기계번역 11개를
 * 방치하는 것보다 6개를 원어민 검수하는 쪽을 택했다.
 * 임금 앱에서 오역은 그대로 금전 오해가 된다.
 *
 * Phase 2 확장: my · th · zh-CN · ru · uz
 * Phase 3 확장: tl · si · bn · mn
 */
export interface LocaleDef {
  code: string
  /** 자국어 표기. 이 화면에서 한국어는 단 한 글자도 쓰지 않는다 */
  nativeName: string
  flag: string
  /** 원어민 검수 통과 여부. false면 "검수중" 배지 + 영어 병기 */
  reviewed: boolean
  /** 별도 폰트가 필요한 스크립트 (선택 언어만 동적 로드) */
  font?: 'khmer' | 'devanagari'
}

export const LOCALES: readonly LocaleDef[] = [
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷', reviewed: true },
  { code: 'en', nativeName: 'English', flag: '🇬🇧', reviewed: true },
  { code: 'vi', nativeName: 'Tiếng Việt', flag: '🇻🇳', reviewed: false },
  { code: 'km', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', reviewed: false, font: 'khmer' },
  { code: 'ne', nativeName: 'नेपाली', flag: '🇳🇵', reviewed: false, font: 'devanagari' },
  { code: 'id', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', reviewed: false },
] as const

export const DEFAULT_LOCALE = 'ko'
export const FALLBACK_LOCALE = 'en'

export type LocaleCode = (typeof LOCALES)[number]['code']

export function isSupportedLocale(code: string): boolean {
  return LOCALES.some((l) => l.code === code)
}

export function findLocale(code: string): LocaleDef | undefined {
  return LOCALES.find((l) => l.code === code)
}

/**
 * navigator.language로 초기값을 추측한다. 언어 선택 화면에서 맨 위로 올린다.
 * "ko-KR" → "ko", "zh-CN" 처럼 지역 코드가 붙어 오는 경우를 처리한다.
 */
export function guessLocale(navigatorLanguages: readonly string[]): string | undefined {
  for (const raw of navigatorLanguages) {
    if (isSupportedLocale(raw)) return raw
    const base = raw.split('-')[0]
    if (base && isSupportedLocale(base)) return base
  }
  return undefined
}
