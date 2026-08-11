'use client'

import { ComingSoon } from '@/components/ComingSoon'

export default function WorkplacesPage() {
  return (
    <ComingSoon
      title="근무지"
      phase="Phase 1-B"
      items={[
        '스티키 노트 카드 그리드 · 색·이모지 자동 배정',
        '공제 방식 4종 + 보험 3종 체크박스 (요율 실시간 산출)',
        '5인 미만 사업장 토글 · 기타 공제(소개비·숙소비)',
        '삭제 없음 — 보관만 (과거 기록의 참조가 깨진다)',
      ]}
    />
  )
}
