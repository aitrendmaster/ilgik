/**
 * 서버 설정. 키가 없으면 기능이 꺼질 뿐 앱이 죽지 않는다.
 * "앱 사용을 절대 막지 않는다"는 원칙은 서버가 붙어도 유지한다.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  googleClientId: process.env.AUTH_GOOGLE_ID ?? '',
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
  authSecret: process.env.AUTH_SECRET ?? '',
  /** 쉼표로 구분한 관리자 Gmail 목록. 이 계정만 /admin에 들어간다 */
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
} as const

/** 로그인 기능을 켤 수 있는 상태인지 */
export const authConfigured = Boolean(
  env.googleClientId && env.googleClientSecret && env.authSecret && env.databaseUrl,
)

export const dbConfigured = Boolean(env.databaseUrl)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return env.adminEmails.includes(email.toLowerCase())
}
