import { and, count, eq, gte, sql } from 'drizzle-orm'
import { getServerDB, schema } from './db/client'

/**
 * 봇 판정.
 *
 * 자동으로 차단하지 않는다. 관찰 가능한 사실만 신호로 모아 점수를 내고
 * 차단 여부는 사람이 정한다. 이 서비스의 오탐은 근로자가 자기 임금 기록을
 * 잃는 것이라 자동 차단의 대가가 너무 크다.
 */

export interface BotAssessment {
  score: number
  signals: string[]
}

const RANDOM_LOCAL_PART = /^[a-z]{2,}[0-9]{5,}$|^[a-z0-9]{16,}$/i
const DISPOSABLE_HINTS = ['mailinator', 'tempmail', 'guerrillamail', '10minutemail', 'yopmail']

/** 이메일만으로 판단할 수 있는 부분 — 가입 시점에 매길 수 있다 */
export function scoreEmail(email: string | null): BotAssessment {
  const signals: string[] = []
  let score = 0
  if (!email) return { score: 0, signals }

  const [local = '', domain = ''] = email.toLowerCase().split('@')
  if (RANDOM_LOCAL_PART.test(local)) {
    signals.push('이메일 아이디가 자동 생성 패턴')
    score += 25
  }
  if (DISPOSABLE_HINTS.some((d) => domain.includes(d))) {
    signals.push('일회용 메일 도메인')
    score += 40
  }
  if (/\+.*\+/.test(local)) {
    signals.push('플러스 별칭 다중 사용')
    score += 10
  }
  return { score, signals }
}

/** 행동으로 판단하는 부분 — DB 사실만 본다 */
export async function assessUser(userId: string): Promise<BotAssessment> {
  const db = getServerDB()
  if (!db) return { score: 0, signals: [] }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  if (!user) return { score: 0, signals: [] }

  const base = scoreEmail(user.email)
  const signals = [...base.signals]
  let score = base.score

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const [logs] = await db
    .select({ n: count() })
    .from(schema.workLogs)
    .where(eq(schema.workLogs.userId, userId))
  const [recent] = await db
    .select({ n: count() })
    .from(schema.workLogs)
    .where(and(eq(schema.workLogs.userId, userId), gte(schema.workLogs.updatedAt, hourAgo)))
  const [places] = await db
    .select({ n: count() })
    .from(schema.workplaces)
    .where(eq(schema.workplaces.userId, userId))
  const [asked] = await db
    .select({ n: count() })
    .from(schema.inquiries)
    .where(eq(schema.inquiries.userId, userId))

  // 사람이 한 시간에 만들 수 있는 기록 수를 크게 넘는다
  if ((recent?.n ?? 0) > 300) {
    signals.push(`1시간 안에 기록 ${recent?.n}건`)
    score += 35
  }
  // 한 사람이 다니는 현장 수의 현실적인 상한을 넘는다
  if ((places?.n ?? 0) > 40) {
    signals.push(`근무지 ${places?.n}곳`)
    score += 20
  }
  if ((asked?.n ?? 0) > 20) {
    signals.push(`문의 ${asked?.n}건`)
    score += 15
  }
  // 가입하고 기록이 하나도 없는데 요청만 있는 계정
  if ((logs?.n ?? 0) === 0 && user.createdAt < hourAgo && (asked?.n ?? 0) > 3) {
    signals.push('기록 없이 문의만 반복')
    score += 20
  }

  return { score: Math.min(100, score), signals }
}

/** 어드민 목록에서 한 번에 갱신한다 */
export async function refreshAssessments(userIds: string[]): Promise<void> {
  const db = getServerDB()
  if (!db) return
  for (const id of userIds) {
    const { score, signals } = await assessUser(id)
    await db
      .update(schema.users)
      .set({ botScore: score, botSignals: signals })
      .where(eq(schema.users.id, id))
  }
}

/**
 * 레이트리밋. 익명 문의 폭주를 막는다.
 * IP를 저장하지 않고 해시만 키로 쓴다.
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = getServerDB()
  if (!db) return true
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const rows = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count })
  return (rows[0]?.count ?? 1) <= limit
}

export async function hashKey(input: string): Promise<string> {
  const data = new TextEncoder().encode(input + '|ilgik')
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
