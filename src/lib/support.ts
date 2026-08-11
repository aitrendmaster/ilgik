
/**
 * 문의 접수.
 *
 * 백엔드가 붙기 전까지는 보낼 곳이 없다. "보냈다"고 거짓말하지 않고
 * 기기에 적어두었다가 채널이 열리면 올린다.
 * NEXT_PUBLIC_API_URL이 설정되면 그때부터 실제 전송된다.
 */
export interface Inquiry {
  id: string
  topic: string
  message: string
  /** 답장 받을 곳. 비워도 접수된다 — 신원을 요구하지 않는다 */
  contact: string
  createdAt: string
  sentAt: string | null
  /** 문의 화면에서 사용자가 쓴 언어. 답장 언어를 정하는 데 쓴다 */
  locale: string
}

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const STORE_KEY = 'ilgik.inquiries'

function readQueue(): Inquiry[] {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '[]') as Inquiry[]
  } catch {
    return []
  }
}

function writeQueue(list: Inquiry[]): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch {
    // 저장에 실패해도 앱 사용을 막지 않는다
  }
}

async function post(inquiry: Inquiry): Promise<boolean> {
  if (!API) return false
  try {
    const res = await fetch(`${API}/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(inquiry),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function submitInquiry(input: {
  topic: string
  message: string
  contact: string
}): Promise<{ delivered: boolean }> {
  const inquiry: Inquiry = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`,
    topic: input.topic,
    message: input.message,
    contact: input.contact,
    createdAt: new Date().toISOString(),
    sentAt: null,
    locale: document.documentElement.lang || 'ko',
  }

  const delivered = await post(inquiry)
  if (delivered) {
    inquiry.sentAt = new Date().toISOString()
  } else {
    writeQueue([...readQueue(), inquiry])
  }
  return { delivered }
}

/** 온라인 복귀·채널 개설 후 쌓인 문의를 올린다. UI를 막지 않는다 */
export async function flushInquiries(): Promise<void> {
  if (!API) return
  const pending = readQueue().filter((i) => !i.sentAt)
  if (pending.length === 0) return
  const remaining: Inquiry[] = []
  for (const inquiry of pending) {
    const ok = await post(inquiry)
    if (!ok) remaining.push(inquiry)
  }
  writeQueue(remaining)
}

/** 문의를 몇 건 적어두었는지 — 설정 화면 배지용 */
export function pendingInquiryCount(): number {
  return readQueue().filter((i) => !i.sentAt).length
}

