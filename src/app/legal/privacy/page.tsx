'use client'

import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { COMPANY, SERVICE_NAME } from '@/lib/company'

/**
 * ⚠️ 법률 검토 전 초안이다.
 * ⚠️ 이 방침은 "현재" 상태를 기술한다 — 서버 없음, 개인정보 수집 없음.
 *    계정 로그인(Google) 기능을 배포하는 시점에 반드시 개정해야 한다.
 *    수집 항목·보유기간·처리위탁(호스팅)·국외이전을 그때 추가한다.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보 처리방침"
      summary={`${SERVICE_NAME}는 지금 개인정보를 수집하지 않습니다. 모든 기록은 이용자의 기기 안에만 저장되고 회사 서버로 전송되지 않습니다.`}
    >
      <section>
        <h2>1. 수집하는 개인정보</h2>
        <p>
          회사는 현재 이용자로부터 개인정보를 수집하지 않습니다. 이름, 연락처, 이메일, 주민등록번호,
          외국인등록번호, 체류자격 등 어떤 신원 정보도 요구하지 않으며 별도의 가입 절차가 없습니다.
        </p>
      </section>

      <section>
        <h2>2. 이용자가 입력한 기록의 처리</h2>
        <p>
          근무지 이름, 시급, 근무시간, 금액 등 이용자가 입력한 내용은 이용자의 기기 내 저장소
          (브라우저 IndexedDB)에만 저장됩니다. 이 데이터는 회사 서버로 전송되지 않으므로 회사는
          그 내용을 열람할 수 없습니다.
        </p>
      </section>

      <section>
        <h2>3. 자동으로 생성되는 정보</h2>
        <p>
          웹사이트 제공을 위한 호스팅 과정에서 접속 로그(IP 주소, 브라우저 종류, 접속 시각)가
          일시적으로 생성될 수 있습니다. 이는 서비스 제공과 보안을 위한 것이며 이용자 개인을
          식별하는 데 사용하지 않습니다.
        </p>
      </section>

      <section>
        <h2>4. 제3자 제공 및 처리위탁</h2>
        <p>
          회사는 이용자의 기록을 제3자에게 제공하지 않습니다. 수사기관 등의 요청이 있더라도 회사는
          이용자의 기록을 보유하고 있지 않으므로 제공할 수 없습니다. 웹사이트 호스팅은
          Vercel Inc.에 위탁하고 있으며, 위탁 범위는 정적 파일 전송에 한정됩니다.
        </p>
      </section>

      <section>
        <h2>5. 보유 기간과 파기</h2>
        <p>
          기록은 이용자가 삭제하기 전까지 이용자의 기기에 남습니다. 이용자는 언제든지 설정 화면에서
          모든 기록을 삭제할 수 있으며, 삭제 시 즉시 복구할 수 없습니다.
        </p>
        <p>
          <Link href="/legal/data-deletion" className="font-semibold text-brand-blue underline">
            데이터 삭제 방법 자세히 보기
          </Link>
        </p>
      </section>

      <section>
        <h2>6. 이용자의 권리</h2>
        <p>
          이용자는 자신의 기록을 언제든지 열람·수정·삭제·내보내기 할 수 있으며, 이 모든 작업은
          이용자의 기기에서 직접 수행됩니다. 회사의 승인이나 요청 절차가 필요하지 않습니다.
        </p>
      </section>

      <section>
        <h2>7. 만 14세 미만 아동</h2>
        <p>회사는 만 14세 미만 아동을 대상으로 서비스를 제공하지 않습니다.</p>
      </section>

      <section>
        <h2>8. 방침의 변경</h2>
        <p>
          계정 로그인 등 개인정보 수집이 필요한 기능을 도입하는 경우, 회사는 시행 최소 7일 전에
          변경 내용을 공지하고 이용자의 동의를 받은 뒤 적용합니다.
        </p>
      </section>

      <section>
        <h2>9. 개인정보 보호책임자</h2>
        <p>
          책임자: {COMPANY.ceo} ({COMPANY.nameKo})
          <br />
          문의: 앱 내{' '}
          <Link href={COMPANY.supportPath} className="font-semibold text-brand-blue underline">
            문의하기
          </Link>
        </p>
      </section>
    </LegalPage>
  )
}
