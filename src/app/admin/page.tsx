import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/server/auth'
import { dbConfigured, env, isAdminEmail } from '@/server/env'
import { getOverview, listInquiries, listUsers } from '@/server/admin'
import { AdminClient } from './AdminClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminPage() {
  if (!dbConfigured) {
    return (
      <Shell>
        <p className="m-0 rounded-xl bg-surface-yellow px-4 py-3 text-sm leading-relaxed text-yellow-dark">
          데이터베이스가 아직 연결되지 않았습니다. <code>DATABASE_URL</code>을 설정하면 이 화면이
          동작합니다.
        </p>
      </Shell>
    )
  }

  const session = await auth()
  if (!session?.user?.email) redirect('/login?next=/admin')

  if (!isAdminEmail(session.user.email)) {
    return (
      <Shell>
        <p className="m-0 rounded-xl bg-coral-light px-4 py-3 text-sm leading-relaxed text-coral-dark">
          이 계정({session.user.email})은 관리자가 아닙니다.
          {env.adminEmails.length === 0 && ' ADMIN_EMAILS 환경변수가 비어 있습니다.'}
        </p>
      </Shell>
    )
  }

  const [overview, users, inquiries] = await Promise.all([
    getOverview(),
    listUsers(),
    listInquiries(),
  ])

  return <AdminClient overview={overview} users={users} inquiries={inquiries} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 bg-surface p-6">
      <h1 className="m-0 text-2xl font-medium tracking-[-0.4px]">관리자</h1>
      {children}
    </div>
  )
}
