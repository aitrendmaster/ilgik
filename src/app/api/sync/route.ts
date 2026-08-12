import { NextResponse } from 'next/server'
import { and, eq, gt } from 'drizzle-orm'
import { auth } from '@/server/auth'
import { getServerDB, schema } from '@/server/db/client'

export const runtime = 'nodejs'

/**
 * 동기화. 서버는 백업용이고 계산을 다시 하지 않는다.
 * 클라이언트가 스냅샷과 함께 계산한 결과를 그대로 보관한다 —
 * 계산 기준이 두 곳에 생기면 금액이 갈라진다.
 *
 * 충돌은 updatedAt이 최신인 쪽이 이긴다 (last-write-wins).
 */

interface PushItem {
  id: string
  updatedAt: string
  deletedAt?: string | null
  payload: unknown
  date?: string
}

async function requireUser() {
  const db = getServerDB()
  if (!db) return { error: NextResponse.json({ error: 'not_ready' }, { status: 503 }) } as const
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const
  }
  const [user] = await db
    .select({ blockedAt: schema.users.blockedAt })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1)
  if (user?.blockedAt) {
    return { error: NextResponse.json({ error: 'blocked' }, { status: 403 }) } as const
  }
  return { db, userId: session.user.id } as const
}

/** 서버 변경분 내려받기 */
export async function GET(req: Request) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx.error
  const since = new Date(new URL(req.url).searchParams.get('since') ?? 0)

  const [places, logs] = await Promise.all([
    ctx.db
      .select()
      .from(schema.workplaces)
      .where(and(eq(schema.workplaces.userId, ctx.userId), gt(schema.workplaces.updatedAt, since))),
    ctx.db
      .select()
      .from(schema.workLogs)
      .where(and(eq(schema.workLogs.userId, ctx.userId), gt(schema.workLogs.updatedAt, since))),
  ])

  return NextResponse.json({ now: new Date().toISOString(), workplaces: places, workLogs: logs })
}

/** 로컬 미동기화분 올리기 */
export async function POST(req: Request) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx.error

  let body: { workplaces?: PushItem[]; workLogs?: PushItem[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const places = (body.workplaces ?? []).slice(0, 500)
  const logs = (body.workLogs ?? []).slice(0, 2000)

  for (const w of places) {
    await ctx.db
      .insert(schema.workplaces)
      .values({
        id: w.id,
        userId: ctx.userId,
        payload: w.payload,
        updatedAt: new Date(w.updatedAt),
        deletedAt: w.deletedAt ? new Date(w.deletedAt) : null,
      })
      .onConflictDoUpdate({
        target: schema.workplaces.id,
        set: { payload: w.payload, updatedAt: new Date(w.updatedAt) },
      })
  }

  for (const l of logs) {
    await ctx.db
      .insert(schema.workLogs)
      .values({
        id: l.id,
        userId: ctx.userId,
        date: l.date ?? '',
        payload: l.payload,
        updatedAt: new Date(l.updatedAt),
        deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
      })
      .onConflictDoUpdate({
        target: schema.workLogs.id,
        set: { payload: l.payload, date: l.date ?? '', updatedAt: new Date(l.updatedAt) },
      })
  }

  return NextResponse.json({ ok: true, now: new Date().toISOString() })
}
