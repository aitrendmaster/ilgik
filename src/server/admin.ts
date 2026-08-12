'use server'

import { desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from './auth'
import { getServerDB, schema } from './db/client'
import { isAdminEmail } from './env'
import { refreshAssessments } from './bot'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    throw new Error('권한이 없습니다.')
  }
  const db = getServerDB()
  if (!db) throw new Error('데이터베이스가 연결되지 않았습니다.')
  return { db, actor: session.user.email }
}

async function log(actorEmail: string, action: string, targetId: string, detail?: string) {
  const db = getServerDB()
  if (!db) return
  await db.insert(schema.adminActions).values({ actorEmail, action, targetId, detail })
}

export interface AdminOverview {
  totalUsers: number
  newThisWeek: number
  blocked: number
  suspicious: number
  openInquiries: number
  totalLogs: number
}

export async function getOverview(): Promise<AdminOverview> {
  const { db } = await requireAdmin()
  const [u] = await db
    .select({
      total: sql<number>`count(*)::int`,
      week: sql<number>`count(*) filter (where "createdAt" > now() - interval '7 days')::int`,
      blocked: sql<number>`count(*) filter (where "blockedAt" is not null)::int`,
      suspicious: sql<number>`count(*) filter (where "botScore" >= 50 and "blockedAt" is null)::int`,
    })
    .from(schema.users)
  const [i] = await db
    .select({ open: sql<number>`count(*) filter (where status = 'open')::int` })
    .from(schema.inquiries)
  const [l] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.workLogs)

  return {
    totalUsers: u?.total ?? 0,
    newThisWeek: u?.week ?? 0,
    blocked: u?.blocked ?? 0,
    suspicious: u?.suspicious ?? 0,
    openInquiries: i?.open ?? 0,
    totalLogs: l?.total ?? 0,
  }
}

export async function listUsers(limit = 100) {
  const { db } = await requireAdmin()
  return db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      createdAt: schema.users.createdAt,
      lastSeenAt: schema.users.lastSeenAt,
      blockedAt: schema.users.blockedAt,
      blockedReason: schema.users.blockedReason,
      botScore: schema.users.botScore,
      botSignals: schema.users.botSignals,
      logCount: sql<number>`(select count(*) from work_log wl where wl."userId" = "user".id)::int`,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(limit)
}

export async function listInquiries(limit = 100) {
  const { db } = await requireAdmin()
  return db
    .select()
    .from(schema.inquiries)
    .orderBy(desc(schema.inquiries.createdAt))
    .limit(limit)
}

export async function setBlocked(userId: string, blocked: boolean, reason: string) {
  const { db, actor } = await requireAdmin()
  await db
    .update(schema.users)
    .set({
      blockedAt: blocked ? new Date() : null,
      blockedReason: blocked ? reason.slice(0, 200) : null,
    })
    .where(eq(schema.users.id, userId))
  await log(actor, blocked ? 'block' : 'unblock', userId, reason)
  revalidatePath('/admin')
}

export async function rescoreAll() {
  const { db, actor } = await requireAdmin()
  const ids = await db.select({ id: schema.users.id }).from(schema.users).limit(500)
  await refreshAssessments(ids.map((r) => r.id))
  await log(actor, 'rescore', 'all', `${ids.length}명`)
  revalidatePath('/admin')
}

export async function setInquiryStatus(id: string, status: 'open' | 'answered' | 'closed') {
  const { db, actor } = await requireAdmin()
  await db.update(schema.inquiries).set({ status }).where(eq(schema.inquiries.id, id))
  await log(actor, 'inquiry:' + status, id)
  revalidatePath('/admin')
}

/**
 * 계정 삭제. 개인정보 파기 요청에 대응한다.
 * cascade로 근무지·기록도 함께 지워진다. 로컬 기기의 기록은 사용자 것이라 건드리지 않는다.
 */
export async function deleteUser(userId: string) {
  const { db, actor } = await requireAdmin()
  await db.delete(schema.users).where(eq(schema.users.id, userId))
  await log(actor, 'delete_user', userId)
  revalidatePath('/admin')
}
