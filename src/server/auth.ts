import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import { authConfigured, env, isAdminEmail } from './env'
import { getServerDB, schema } from './db/client'

/**
 * Gmail 로그인.
 *
 * 기획서는 원래 휴대폰+PIN을 계획했지만, 실제로는 대부분의 사용자 기기에
 * Google 계정이 이미 로그인돼 있어 탭 한 번이면 끝난다. PIN 분실 복구 문제도 없다.
 * 그리고 Google이 email_verified를 함께 주므로 별도 인증 메일이 필요 없다.
 *
 * 수집은 이메일과 표시 이름까지다. 국적·체류자격은 어떤 경우에도 받지 않는다.
 */
const db = getServerDB()

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 키가 없으면 provider가 비어 로그인 시도가 실패할 뿐, 앱은 그대로 돈다
  providers: authConfigured
    ? [
        Google({
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret,
          authorization: { params: { scope: 'openid email profile', prompt: 'select_account' } },
        }),
      ]
    : [],
  adapter: db ? DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }) : undefined,
  secret: env.authSecret || 'dev-only-insecure-secret',
  session: { strategy: db ? 'database' : 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ user }) {
      if (!db || !user.email) return true
      // 차단된 계정은 로그인 자체를 막는다
      const rows = await db
        .select({ blockedAt: schema.users.blockedAt })
        .from(schema.users)
        .where(eq(schema.users.email, user.email))
        .limit(1)
      if (rows[0]?.blockedAt) return false
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user?.id ?? session.user.id
        session.user.isAdmin = isAdminEmail(session.user.email)
      }
      // 마지막 접속 시각은 봇 판정과 휴면 계정 정리에 쓴다
      if (db && user?.id) {
        await db
          .update(schema.users)
          .set({ lastSeenAt: new Date() })
          .where(eq(schema.users.id, user.id))
      }
      return session
    },
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isAdmin: boolean
    }
  }
}
