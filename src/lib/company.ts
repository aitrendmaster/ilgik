/**
 * 사업자 정보. 전자상거래법상 표시 의무 항목이라 한 곳에서만 관리한다.
 * ⚠️ 주소는 제공받은 표기 그대로다. 도로명 표기가 불완전해 보이므로
 *    (건물번호 누락 가능) 공개 전 사업자등록증과 대조가 필요하다.
 */
export const COMPANY = {
  nameKo: '주식회사 에이티엠스토어',
  nameEn: 'ATM Store Co., Ltd.',
  ceo: '오유진',
  businessNumber: '396-21-02113',
  mailOrderNumber: '2025-부천소사-0174',
  address: '경기도 부천시 소사로 257길 6층 C14',
  /** 문의 접수는 앱 내 /support 채널을 기본으로 한다 */
  supportPath: '/support',
} as const

export const SERVICE_NAME = '일당노트'

/** 약관·방침 개정 시 갱신한다. 사용자에게 표시되는 시행일 */
export const POLICY_EFFECTIVE_DATE = '2026-08-12'
