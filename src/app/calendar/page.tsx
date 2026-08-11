'use client'

import { ComingSoon } from '@/components/ComingSoon'

export default function CalendarPage() {
  return (
    <ComingSoon
      title="달력"
      phase="Phase 1-D"
      items={[
        '월간 그리드 · 근무지 색 사각 마커',
        '하루 여러 건이면 마커 여러 개 (하루 2탕)',
        '특근·휴일은 coral-light 셀 배경',
        '날짜 탭 → 기록 시트 · 스와이프 삭제 + 5초 되돌리기',
      ]}
    />
  )
}
