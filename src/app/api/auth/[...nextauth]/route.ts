import { NextResponse, type NextRequest } from 'next/server'
import { handlers } from '@/server/auth'
import { authConfigured } from '@/server/env'

export const runtime = 'nodejs'

/**
 * 인증 키가 설정되기 전에는 Auth.js가 500을 뱉는다.
 * SessionProvider는 페이지마다 세션을 조회하므로 그대로 두면 모든 화면에서
 * 콘솔 에러가 쏟아진다. 키가 없으면 "로그인하지 않은 상태"를 조용히 돌려준다.
 */
export async function GET(req: NextRequest) {
  if (!authConfigured) return NextResponse.json(null)
  return handlers.GET(req)
}

export async function POST(req: NextRequest) {
  if (!authConfigured) {
    return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 })
  }
  return handlers.POST(req)
}
