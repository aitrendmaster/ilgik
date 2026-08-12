import Link from 'next/link'
import { signIn } from '@/server/auth'
import { authConfigured } from '@/server/env'
import { GUEST_RETENTION_DAYS } from '@/lib/guest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 로그인 화면.
 *
 * 앱을 쓰기 위한 관문이 아니다. 기록은 로그인 없이도 계속 할 수 있고,
 * 여기는 "휴대폰을 바꿔도 기록이 남게 하는" 곳이다.
 * 그래서 제목이 "로그인"이 아니라 "기록 지키기"다.
 */
export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-4 bg-surface px-5">
      <div className="rounded-xxxl border border-hairline-soft bg-canvas p-6">
        <span className="text-4xl" aria-hidden="true">
          🔐
        </span>
        <h1 className="m-0 mt-3 text-2xl font-medium tracking-[-0.4px]">기록 지키기</h1>
        <p className="m-0 mt-2 text-[15px] leading-relaxed text-slate">
          휴대폰을 바꾸거나 잃어버려도 기록이 남습니다. {GUEST_RETENTION_DAYS}일이 지난 기록도 계속
          볼 수 있어요.
        </p>

        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-[14px] text-slate">
          {[
            '이메일만 받아요',
            '국적이나 체류자격은 묻지 않아요',
            '언제든 계정과 기록을 지울 수 있어요',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <svg
                className="mt-0.5 flex-none text-success"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {line}
            </li>
          ))}
        </ul>

        {authConfigured ? (
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="mt-5 flex h-16 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-lg font-medium text-on-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#fff"
                  d="M21.6 12.2c0-.6-.05-1.2-.15-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1z"
                />
                <path
                  fill="#fff"
                  d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
                />
                <path fill="#fff" d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14z" />
                <path
                  fill="#fff"
                  d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9z"
                />
              </svg>
              Google로 계속하기
            </button>
          </form>
        ) : (
          <p className="m-0 mt-5 rounded-xl bg-surface-yellow px-4 py-3 text-[13px] leading-relaxed text-yellow-dark">
            로그인 기능을 준비하고 있어요. 지금은 로그인 없이 그대로 쓰시면 되고, 기록은 설정에서
            파일로 내보내 보관해 주세요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-center text-[13px] text-steel">
        <Link href="/" className="font-medium text-ink underline">
          로그인 없이 계속 쓰기
        </Link>
        <p className="m-0 leading-relaxed">
          계속하면{' '}
          <Link href="/legal/terms" className="underline">
            이용약관
          </Link>
          과{' '}
          <Link href="/legal/privacy" className="underline">
            개인정보 처리방침
          </Link>
          에 동의하는 것으로 봅니다.
        </p>
      </div>
    </div>
  )
}
