'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { submitInquiry } from '@/lib/support'
import { useSnackbar } from '@/store/ui'

const TOPICS = [
  { id: 'calc', label: '계산이 이상해요' },
  { id: 'bug', label: '앱이 안 돼요' },
  { id: 'wage', label: '임금을 못 받았어요' },
  { id: 'etc', label: '그 밖에' },
] as const

export default function SupportPage() {
  const showSnack = useSnackbar((s) => s.show)
  const [topic, setTopic] = useState<string>('calc')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle')

  const canSend = message.trim().length >= 5 && state !== 'sending'

  async function handleSend() {
    setState('sending')
    const result = await submitInquiry({ topic, message: message.trim(), contact: contact.trim() })
    setState(result.delivered ? 'sent' : 'queued')
    setMessage('')
    showSnack(result.delivered ? '보냈어요' : '적어두었어요')
  }

  return (
    <LegalPage
      title="문의하기"
      summary="앱이 이상하거나 계산이 안 맞으면 알려주세요. 이름이나 연락처를 쓰지 않아도 보낼 수 있어요."
    >
      {/* 임금 체불은 앱이 해결해줄 수 없다. 실제 도움이 되는 곳을 먼저 보여준다 */}
      <section>
        <h2>돈을 못 받았다면</h2>
        <p>
          앱으로는 밀린 임금을 받아드릴 수 없어요. 고용노동부에 신고하면 통역을 받아 상담할 수
          있습니다.
        </p>
        <a
          href="tel:1350"
          className="mt-3 flex h-16 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-medium text-on-primary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
          </svg>
          1350 전화하기
        </a>
      </section>

      <section>
        <h2>앱에 대한 문의</h2>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
              className={`min-h-12 rounded-full px-3 text-[14px] ${
                topic === t.id
                  ? 'bg-primary font-semibold text-on-primary'
                  : 'border border-hairline-strong bg-canvas font-medium text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="무슨 일이 있었는지 적어주세요"
          className="mt-3 w-full rounded-md border border-hairline-strong bg-canvas p-3.5 text-[15px] leading-relaxed outline-none focus:border-brand-blue"
        />

        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="답장 받을 곳 (안 써도 돼요)"
          className="mt-2 h-14 w-full rounded-md border border-hairline-strong bg-canvas px-4 text-[15px] outline-none focus:border-brand-blue"
        />

        <button
          type="button"
          disabled={!canSend}
          onClick={handleSend}
          className={`mt-3 flex h-16 w-full items-center justify-center rounded-full text-lg font-medium ${
            canSend ? 'bg-primary text-on-primary' : 'bg-hairline text-muted'
          }`}
        >
          보내기
        </button>

        {state === 'queued' && (
          <p className="m-0 mt-3 rounded-xl bg-surface-yellow px-4 py-3 text-[13px] leading-relaxed text-yellow-dark">
            문의 채널을 아직 준비하고 있어요. 적어주신 내용은 이 기기에 저장해 두었다가 채널이
            열리면 보내드릴게요. 급한 일이면 위 1350으로 전화해 주세요.
          </p>
        )}
        {state === 'sent' && (
          <p className="m-0 mt-3 rounded-xl bg-teal-light px-4 py-3 text-[13px] leading-relaxed text-moss-dark">
            잘 받았어요. 답장 받을 곳을 적어주셨으면 그리로 연락드릴게요.
          </p>
        )}
      </section>

      <section>
        <h2>그 밖에</h2>
        <p>
          <Link href="/legal/data-deletion" className="font-semibold text-brand-blue underline">
            내 기록 전부 지우기
          </Link>
        </p>
      </section>
    </LegalPage>
  )
}
