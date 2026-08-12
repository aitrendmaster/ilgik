import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

/**
 * 서버 스키마.
 *
 * ⚠️ 수집 최소화 원칙
 * 이 서비스의 사용자군에는 체류자격이 불안정한 사람이 포함될 수 있다.
 * 국적·체류자격·외국인등록번호·주소·전화번호는 어떤 경우에도 저장하지 않는다.
 * Google이 주는 값 중에서도 이메일과 표시 이름만 쓴다.
 */

// ── Auth.js 표준 테이블 ────────────────────────────────────────
export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),

  // ── 서비스 고유 필드 ──
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  lastSeenAt: timestamp('lastSeenAt', { mode: 'date' }).notNull().defaultNow(),
  /** 차단되면 동기화·문의가 막힌다. 로컬 기록은 건드리지 않는다 */
  blockedAt: timestamp('blockedAt', { mode: 'date' }),
  blockedReason: text('blockedReason'),
  /** 자동 판정 점수 0~100. 높을수록 봇에 가깝다. 판단은 사람이 한다 */
  botScore: integer('botScore').notNull().default(0),
  botSignals: jsonb('botSignals').$type<string[]>().notNull().default([]),
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
)

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

// ── 서비스 데이터 ──────────────────────────────────────────────

/** 근무지. 로컬 id를 그대로 쓴다 (동기화 시 충돌 없이 upsert) */
export const workplaces = pgTable(
  'workplace',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deletedAt', { mode: 'date' }),
  },
  (t) => [index('workplace_user_idx').on(t.userId)],
)

/**
 * 근무 기록.
 * 서버는 계산을 다시 하지 않는다. 클라이언트가 스냅샷과 함께 계산한 결과를
 * 그대로 보관한다 — 계산 기준이 두 곳에 생기면 금액이 갈라진다.
 */
export const workLogs = pgTable(
  'work_log',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deletedAt', { mode: 'date' }),
  },
  (t) => [index('work_log_user_idx').on(t.userId), index('work_log_user_date_idx').on(t.userId, t.date)],
)

/** 문의. 로그인하지 않아도 보낼 수 있다 — 신원을 요구하지 않는다 */
export const inquiries = pgTable(
  'inquiry',
  {
    id: text('id').primaryKey(),
    userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
    topic: text('topic').notNull(),
    message: text('message').notNull(),
    /** 답장 받을 곳. 비어 있을 수 있다 */
    contact: text('contact'),
    locale: text('locale').notNull().default('ko'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    status: text('status').$type<'open' | 'answered' | 'closed'>().notNull().default('open'),
    adminNote: text('adminNote'),
    /** 스팸 방지용. IP는 저장하지 않고 레이트리밋 키의 해시만 남긴다 */
    senderHash: text('senderHash'),
  },
  (t) => [index('inquiry_status_idx').on(t.status), index('inquiry_created_idx').on(t.createdAt)],
)

/** 레이트리밋 — 익명 문의 폭주와 봇 가입 시도를 막는다 */
export const rateLimits = pgTable(
  'rate_limit',
  {
    key: text('key').notNull(),
    windowStart: timestamp('windowStart', { mode: 'date' }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [uniqueIndex('rate_limit_key_window_idx').on(t.key, t.windowStart)],
)

/** 어드민 조치 감사 로그. 차단은 사람의 결정이므로 기록을 남긴다 */
export const adminActions = pgTable('admin_action', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  actorEmail: text('actorEmail').notNull(),
  action: text('action').notNull(),
  targetId: text('targetId'),
  detail: text('detail'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
})

export const isBlocked = (u: { blockedAt: Date | null }) => u.blockedAt !== null
export type UserRow = typeof users.$inferSelect
export type InquiryRow = typeof inquiries.$inferSelect
