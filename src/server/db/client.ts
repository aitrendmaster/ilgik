import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { env } from '../env'
import * as schema from './schema'

/**
 * Neon HTTP 드라이버. 서버리스 함수마다 커넥션 풀을 들지 않는다.
 * DATABASE_URL이 없으면 null을 돌려주고, 호출부가 503으로 처리한다.
 */
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getServerDB() {
  if (!env.databaseUrl) return null
  if (!cached) {
    cached = drizzle(neon(env.databaseUrl), { schema })
  }
  return cached
}

export { schema }
