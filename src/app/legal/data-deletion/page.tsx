'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LegalPage } from '@/components/legal/LegalPage'
import { clearAll, exportBackup } from '@/lib/db/repo'
import { SERVICE_NAME } from '@/lib/company'
import { useSnackbar } from '@/store/ui'

/**
 * 데이터 삭제 안내 — 스토어 심사와 Google OAuth 검수에서 공개 URL을 요구한다.
 * 안내만 있고 실제로 지워지지 않으면 안 되므로 이 화면에서 바로 지운다.
 */
export default function DataDeletionPage() {
  const router = useRouter()
  const showSnack = useSnackbar((s) => s.show)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleBackupFirst() {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ilgik-backup-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await clearAll()
      showSnack('모든 기록을 지웠어요')
      router.push('/')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <LegalPage
      title="데이터 삭제"
      summary={`${SERVICE_NAME}의 기록은 이용자의 기기 안에만 있습니다. 아래 버튼을 누르면 이 기기에서 즉시 완전히 지워지며, 되돌릴 수 없습니다.`}
    >
      <section>
        <h2>무엇이 지워지나요</h2>
        <ul>
          <li>등록한 모든 근무지</li>
          <li>모든 근무 기록과 계산 결과</li>
          <li>지급 확인 기록</li>
        </ul>
      </section>

      <section>
        <h2>지우기 전에</h2>
        <p>
          기록은 임금 체불이 생겼을 때 근로자 본인이 가진 증거가 될 수 있습니다. 지우기 전에 파일로
          내보내 보관하시길 권합니다.
        </p>
        <button
          type="button"
          onClick={handleBackupFirst}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline-strong bg-canvas text-base font-medium text-ink"
        >
          먼저 파일로 내보내기
        </button>
      </section>

      <section>
        <h2>지금 지우기</h2>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full border-2 border-coral-dark bg-canvas text-base font-semibold text-coral-dark"
          >
            모든 기록 지우기
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-2 rounded-xl bg-coral-light p-4">
            <p className="m-0 text-[14px] font-semibold text-coral-dark">
              정말 지울까요? 되돌릴 수 없어요.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="flex h-14 w-full items-center justify-center rounded-full bg-coral-dark text-base font-semibold text-white disabled:opacity-60"
            >
              네, 전부 지울게요
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex h-12 w-full items-center justify-center rounded-full text-base font-medium text-coral-dark"
            >
              그만두기
            </button>
          </div>
        )}
      </section>

      <section>
        <h2>계정 데이터</h2>
        <p>
          현재 서비스는 계정을 만들지 않으며 회사 서버에 보관하는 이용자 데이터가 없습니다. 계정
          기능이 도입되면 이 화면에서 계정 삭제도 함께 처리할 수 있도록 하겠습니다.
        </p>
      </section>
    </LegalPage>
  )
}
