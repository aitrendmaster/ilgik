import { NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { getServerDB, schema } from '@/server/db/client'
import { hashKey, hitRateLimit } from '@/server/bot'

export const runtime = 'nodejs'

/** 로그인하지 않아도 문의할 수 있다 — 신원을 요구하지 않는다 */
export async function POST(req: Request) {
  const db = getServerDB()
  if (!db) {
    return NextResponse.json({ error: 'channel_not_ready' }, { status: 503 })
  }

  let body: { id?: string; topic?: string; message?: string; contact?: string; locale?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (message.length < 5 || message.length > 4000) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // IP는 저장하지 않고 레이트리밋 키의 해시만 남긴다
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const senderHash = await hashKey(ip)

  const allowed = await hitRateLimit(`support:${senderHash}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'too_many' }, { status: 429 })
  }

  const session = await auth().catch(() => null)

  await db
    .insert(schema.inquiries)
    .values({
      id: body.id ?? crypto.randomUUID(),
      userId: session?.user?.id ?? null,
      topic: (body.topic ?? 'etc').slice(0, 40),
      message,
      contact: (body.contact ?? '').slice(0, 200) || null,
      locale: (body.locale ?? 'ko').slice(0, 10),
      senderHash,
    })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true })
}
