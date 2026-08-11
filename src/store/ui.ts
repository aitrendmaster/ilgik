'use client'

import { create } from 'zustand'
import type { WorkLog } from '@/lib/db/schema'

/** 기록 입력 시트 — 홈·달력 어디서든 열 수 있어야 해서 전역에 둔다 */
interface LogSheetState {
  open: boolean
  date: string | null
  /** 수정 모드일 때 원본 기록 */
  editing: WorkLog | null
  openSheet: (date: string, editing?: WorkLog | null) => void
  close: () => void
}

export const useLogSheet = create<LogSheetState>((set) => ({
  open: false,
  date: null,
  editing: null,
  openSheet: (date, editing = null) => set({ open: true, date, editing }),
  close: () => set({ open: false, editing: null }),
}))

/** 근무지 만들기·수정 시트 */
interface WorkplaceSheetState {
  open: boolean
  editingId: string | null
  /** 저장 직후 이 근무지로 기록 입력을 이어갈지 */
  continueToLog: boolean
  openNew: (continueToLog?: boolean) => void
  openEdit: (id: string) => void
  close: () => void
}

export const useWorkplaceSheet = create<WorkplaceSheetState>((set) => ({
  open: false,
  editingId: null,
  continueToLog: false,
  openNew: (continueToLog = false) => set({ open: true, editingId: null, continueToLog }),
  openEdit: (id) => set({ open: true, editingId: id, continueToLog: false }),
  close: () => set({ open: false, editingId: null, continueToLog: false }),
}))

/**
 * 되돌리기 스낵바.
 * 삭제는 즉시 실행하지 않고 5초 동안 되돌릴 수 있어야 한다 —
 * 잘못 눌러 기록이 사라지면 그게 곧 증거 소실이다.
 */
export const UNDO_TIMEOUT_MS = 5000

interface SnackbarState {
  message: string | null
  undo: (() => void) | null
  show: (message: string, undo?: () => void) => void
  dismiss: () => void
}

export const useSnackbar = create<SnackbarState>((set) => ({
  message: null,
  undo: null,
  show: (message, undo) => set({ message, undo: undo ?? null }),
  dismiss: () => set({ message: null, undo: null }),
}))
