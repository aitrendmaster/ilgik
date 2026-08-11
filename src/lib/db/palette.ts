/**
 * 근무지 스티키 팔레트.
 *
 * 색·이모지는 추가할 때 미사용 값 중에서 자동 배정한다.
 * 저문해 사용자에게 "색을 고르세요"는 그 자체로 마찰이고,
 * 고르게 두면 비슷한 색을 연달아 골라 달력에서 구분이 안 된다.
 */

export const COLOR_TOKENS = [1, 2, 3, 4, 5, 6, 7, 8] as const

/** 진한 배경(6·7·8) 위에는 흰 글자를 쓴다. 전 조합 대비 4.5:1 이상 */
const DARK_BACKGROUNDS = new Set([6, 7, 8])

export function colorVar(token: number): string {
  return `var(--wp-${token})`
}

export function onColorClass(token: number): string {
  return DARK_BACKGROUNDS.has(token) ? 'text-white' : 'text-ink'
}

export function isDarkToken(token: number): boolean {
  return DARK_BACKGROUNDS.has(token)
}

/** 현장에서 알아보기 쉬운 것들로만 고른다 */
export const EMOJIS = [
  '🏭',
  '🔩',
  '🚚',
  '📦',
  '🏗️',
  '🧱',
  '🏢',
  '🍽️',
  '🐟',
  '🧊',
  '🚜',
  '🧹',
] as const

function leastUsed<T>(candidates: readonly T[], used: readonly T[]): T {
  const counts = new Map<T, number>()
  for (const c of candidates) counts.set(c, 0)
  for (const u of used) counts.set(u, (counts.get(u) ?? 0) + 1)
  let best = candidates[0] as T
  let bestCount = Number.POSITIVE_INFINITY
  for (const c of candidates) {
    const n = counts.get(c) ?? 0
    if (n < bestCount) {
      best = c
      bestCount = n
    }
  }
  return best
}

export function pickColorToken(usedTokens: readonly number[]): number {
  return leastUsed(COLOR_TOKENS, usedTokens)
}

export function pickEmoji(usedEmojis: readonly string[]): string {
  return leastUsed(EMOJIS, usedEmojis)
}
