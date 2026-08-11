/**
 * 금액은 항상 원 단위 정수이고 통화는 KRW 고정이다.
 *
 * Intl.NumberFormat에 로케일을 넘기면 정적 프리렌더(ko)와 클라이언트 로케일이
 * 달라질 때 하이드레이션 불일치가 난다. 자릿수 구분은 대상 6개 언어에서 모두
 * 쉼표라 결정적으로 포맷한다.
 */
export function formatWon(amount: number): string {
  return Math.round(amount).toLocaleString('en-US')
}

/** 부호를 강제로 붙인다. 공제액 표시용 */
export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '−' : ''
  return `${sign}${formatWon(Math.abs(amount))}`
}

/** 분 → "8시간" / "8시간 30분" 형태의 숫자 부분만. 단위는 번역 문자열이 붙인다 */
export function splitHours(minutes: number): { h: number; m: number } {
  return { h: Math.floor(minutes / 60), m: minutes % 60 }
}

/** 분 → "8h" / "8.5h" (달력 셀처럼 좁은 자리) */
export function formatHoursShort(minutes: number): string {
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

/** 0.049040775 → "4.904%" */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

/** "2026-08-25" → { month: 8, day: 25, weekday: "화" } */
export function parseDateParts(iso: string): { month: number; day: number; weekday: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1))
  return {
    month: m ?? 1,
    day: d ?? 1,
    weekday: WEEKDAY_KO[date.getUTCDay()] ?? '',
  }
}

/** "2026-08-12", -1 → "2026-08-11". 로컬 달력 기준으로 옮긴다 */
export function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}
