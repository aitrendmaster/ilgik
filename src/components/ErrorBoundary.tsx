'use client'

import { Component, type ReactNode } from 'react'

/**
 * 저장소가 실패해도 흰 화면을 보여주지 않는다.
 *
 * 이 앱의 약속은 "네트워크가 없어도, 무엇이 실패해도 사용을 막지 않는다"이고
 * 아무것도 없는 화면은 그 약속을 가장 크게 어긴다.
 * 사용자가 읽을 수 있는 안내와 복구 수단(새로고침)을 남긴다.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-4 bg-surface px-5">
        <div className="rounded-xxxl border border-hairline-soft bg-canvas p-6 text-center">
          <span className="text-4xl" aria-hidden="true">
            🔧
          </span>
          <p className="m-0 mt-3 text-lg font-medium">잠깐 문제가 생겼어요</p>
          <p className="m-0 mt-2 text-sm leading-relaxed text-steel">
            저장된 기록은 그대로 있어요. 다시 열어보세요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-primary text-base font-medium text-on-primary"
          >
            다시 열기
          </button>
        </div>
        <p className="m-0 break-words text-center font-mono text-[11px] leading-relaxed text-stone">
          {this.state.error.name}: {this.state.error.message}
        </p>
      </div>
    )
  }
}
