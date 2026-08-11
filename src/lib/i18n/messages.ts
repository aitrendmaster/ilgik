import { DEFAULT_LOCALE, FALLBACK_LOCALE, findLocale, isSupportedLocale } from './config'

/** 네임스페이스 하나 = 문자열 맵. `_note` 같은 최상위 문자열도 허용한다 */
export type Messages = Record<string, string | Record<string, string>>

const loaders: Record<string, () => Promise<{ default: Messages }>> = {
  ko: () => import('@/messages/ko.json'),
  en: () => import('@/messages/en.json'),
  vi: () => import('@/messages/vi.json'),
  km: () => import('@/messages/km.json'),
  ne: () => import('@/messages/ne.json'),
  id: () => import('@/messages/id.json'),
}

/**
 * 검수 게이트 — 원어민 검수를 통과하지 않은 로케일은 `legal` 네임스페이스를
 * 영어로 대체한다. 금액·법률 문구의 오역은 그대로 임금 오해가 되므로
 * 미검수 초안을 그 자리에 노출하지 않는다.
 *
 * 언어 목록에는 "검수중" 배지를 함께 표시한다 (LocaleDef.reviewed).
 */
export async function loadMessages(locale: string): Promise<Messages> {
  const code = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
  const loader = loaders[code] ?? loaders[DEFAULT_LOCALE]
  const messages = (await loader!()).default

  const def = findLocale(code)
  if (def && !def.reviewed) {
    const fallback = (await loaders[FALLBACK_LOCALE]!()).default
    return { ...messages, legal: fallback.legal as Record<string, string> }
  }
  return messages
}
