'use client'

import { useState, useTransition, type ReactNode } from 'react'
import {
  deleteUser,
  listInquiries,
  listUsers,
  rescoreAll,
  setBlocked,
  setInquiryStatus,
  type AdminOverview,
} from '@/server/admin'

type UserRow = Awaited<ReturnType<typeof listUsers>>[number]
type InquiryRow = Awaited<ReturnType<typeof listInquiries>>[number]

const TABS = ['현황', '회원', '문의'] as const

export function AdminClient({
  overview,
  users,
  inquiries,
}: {
  overview: AdminOverview
  users: UserRow[]
  inquiries: InquiryRow[]
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('현황')
  const [pending, start] = useTransition()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 bg-surface p-5 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-2xl font-medium tracking-[-0.4px]">관리자</h1>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => void rescoreAll())}
          className="ml-auto rounded-full border border-hairline-strong bg-canvas px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          봇 점수 다시 계산
        </button>
      </header>

      <nav className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === t
                ? 'bg-primary font-semibold text-on-primary'
                : 'border border-hairline bg-canvas font-medium text-steel'
            }`}
          >
            {t}
            {t === '문의' && overview.openInquiries > 0 && (
              <span className="ml-1.5 rounded-full bg-coral-light px-1.5 text-xs text-coral-dark">
                {overview.openInquiries}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === '현황' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="전체 회원" value={overview.totalUsers} />
          <Stat label="이번 주 가입" value={overview.newThisWeek} />
          <Stat label="전체 기록" value={overview.totalLogs} />
          <Stat label="차단됨" value={overview.blocked} tone="coral" />
          <Stat label="의심 계정" value={overview.suspicious} tone="yellow" />
          <Stat label="답변 대기 문의" value={overview.openInquiries} tone="yellow" />
        </div>
      )}

      {tab === '회원' && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {users.length === 0 && <Empty>아직 가입한 회원이 없습니다.</Empty>}
          {users.map((u) => (
            <UserCard key={u.id} user={u} pending={pending} start={start} />
          ))}
        </ul>
      )}

      {tab === '문의' && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {inquiries.length === 0 && <Empty>들어온 문의가 없습니다.</Empty>}
          {inquiries.map((q) => (
            <li key={q.id} className="rounded-xl border border-hairline-soft bg-canvas p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-steel">
                <span className="rounded-full bg-surface px-2 py-0.5 font-medium">{q.topic}</span>
                <span>{new Date(q.createdAt).toLocaleString('ko-KR')}</span>
                <span className="rounded-full bg-surface px-2 py-0.5">{q.locale}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${
                    q.status === 'open'
                      ? 'bg-coral-light text-coral-dark'
                      : 'bg-teal-light text-moss-dark'
                  }`}
                >
                  {q.status}
                </span>
              </div>
              <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed">{q.message}</p>
              {q.contact && <p className="m-0 mt-2 text-xs text-slate">답장 받을 곳: {q.contact}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => void setInquiryStatus(q.id, 'answered'))}
                  className="rounded-full border border-hairline-strong px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  답변함
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => void setInquiryStatus(q.id, 'closed'))}
                  className="rounded-full border border-hairline-strong px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  닫기
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'coral' | 'yellow' }) {
  const bg =
    tone === 'coral' ? 'bg-coral-light' : tone === 'yellow' ? 'bg-surface-yellow' : 'bg-canvas'
  return (
    <div className={`rounded-xl border border-hairline-soft p-4 ${bg}`}>
      <div className="text-xs font-medium text-steel">{label}</div>
      <div className="tnum mt-1 text-3xl font-medium tracking-[-1px]">{value}</div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-xl border border-hairline-soft bg-canvas p-6 text-center text-sm text-steel">
      {children}
    </li>
  )
}

function UserCard({
  user,
  pending,
  start,
}: {
  user: UserRow
  pending: boolean
  start: (fn: () => void) => void
}) {
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const blocked = user.blockedAt !== null
  const suspicious = user.botScore >= 50

  return (
    <li
      className={`rounded-xl border p-4 ${
        blocked
          ? 'border-transparent bg-coral-light'
          : suspicious
            ? 'border-transparent bg-surface-yellow'
            : 'border-hairline-soft bg-canvas'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold">{user.email ?? '(이메일 없음)'}</span>
        <span className="text-xs text-steel">{user.name}</span>
        <span className="tnum ml-auto text-xs text-steel">기록 {user.logCount}건</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-steel">
        <span>가입 {new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
        <span>최근 {new Date(user.lastSeenAt).toLocaleDateString('ko-KR')}</span>
        <span className="tnum">봇 점수 {user.botScore}</span>
      </div>

      {user.botSignals.length > 0 && (
        <ul className="m-0 mt-2 list-disc pl-5 text-xs text-yellow-dark">
          {user.botSignals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}

      {blocked && (
        <p className="m-0 mt-2 text-xs font-semibold text-coral-dark">
          차단됨 — {user.blockedReason || '사유 없음'}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!blocked && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="차단 사유 (감사 로그에 남습니다)"
            className="h-9 min-w-40 flex-1 rounded-md border border-hairline-strong bg-canvas px-3 text-xs outline-none"
          />
        )}
        <button
          type="button"
          disabled={pending || (!blocked && reason.trim().length === 0)}
          onClick={() => start(() => void setBlocked(user.id, !blocked, reason.trim()))}
          className="rounded-full border border-hairline-strong bg-canvas px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          {blocked ? '차단 풀기' : '차단'}
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-coral-dark"
          >
            계정 삭제
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => void deleteUser(user.id))}
            className="rounded-full bg-coral-dark px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            정말 삭제 (되돌릴 수 없음)
          </button>
        )}
      </div>
    </li>
  )
}
