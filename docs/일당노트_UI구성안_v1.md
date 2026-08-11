# 일당노트 — 주요 화면 UI 구성안 v1

> 기준 문서 ① `일당노트_서비스기획서_v1.md` (제품 요구)
> 기준 문서 ② `DESIGN-ILGIK.md` (디자인 시스템 — **색·타이포·컴포넌트 규격은 이쪽이 우선**)
> 시각 목업: 아티팩트 9개 화면 (실제 토큰·치수로 렌더)

---

## 0. 시스템 매핑 — 기획서 색 방향을 DESIGN-ILGIK로 교체

기획서의 비주얼 디렉션(작업복 인디고 `#16233A` + 안전조끼 노랑 CTA + 급여봉투 은유)은 DESIGN-ILGIK와 충돌한다. **DESIGN-ILGIK가 우선**하므로 아래와 같이 재배치했다.

| 역할 | 기획서 원안 | 확정 (DESIGN-ILGIK) | 근거 |
|---|---|---|---|
| 주 CTA | `--safety #F5C518` 노랑 | **`primary #1c1c1e` black pill + `rounded.full`** | "Don't use brand-yellow on standard CTAs". 흰 배경 위 검정은 대비 21:1로 시인성이 더 좋다 |
| 브랜드 노랑 | CTA 전용 | **로고 마크 · 태그 칩 전용** (`badge-tag-yellow`) | "Reserve brand-yellow for the wordmark, promo banner, and yellow tag chips" |
| 실수령 금액 | `--money #0E9F6E` | **`success-accent #00b473`** | 시스템 semantic 토큰 |
| 미지급 · 경고 | `--alert #E8590C` | **`coral-light #ffc6c6` 지면 + `coral-dark #600000` 글자** | `badge-tag-coral` 규격. "Don't introduce accent colors beyond yellow + brand pastels" |
| 선택 상태 (폼) | ink 반전 | **`brand-blue #4262ff` 2px + `featured #f5f3ff` 배경** | `pricing-card-featured` 규격 |
| 선택 상태 (탭·프리셋) | ink 반전 | **`pill-tab-active`** — `primary` 지면 + 흰 글자 | 시스템 규격 그대로 |
| 폰트 굵기 | 700~800 | **400 / 500 / 600만** | "Roobert PRO does not use 700 in this system". 위계는 **크기와 색**으로 만든다 |
| 배경 | `--paper #F7F8FA` | `surface #f7f8fa` (동일) | 우연히 일치 |
| 카드 | 그림자 + 노이즈 | **flat + `hairline-soft` 1px** | "Don't apply heavy shadows on flat documentation cards" |

### 0-1. 은유 전환 — 급여봉투 → 스티키 노트

기획서의 시그니처는 **급여봉투 카드**(톱니 절취선 + 종이 노이즈 + 도장 스탬프)였다. 이는 DESIGN-ILGIK의 `flat + hairline` 원칙, "무거운 그림자 금지", 파스텔 카드 규격과 정면으로 충돌한다.

**→ 근무지를 스티키 노트로 재정의한다.**

- Miro의 파스텔 피처 카드는 원래 화이트보드 스티키 팔레트에서 온 것이고, "오늘 어디서 일했는지 붙여두는 메모"라는 제품 행위와 정확히 겹친다
- 봉투는 월 1회의 순간이지만, 스티키는 **매일의 기록 행위**와 맞다
- 달력이 스티키를 붙여둔 보드처럼 읽힌다 → 저문해 사용자의 "색으로 인지" 요구와도 맞는다

| 원안 요소 | 처리 |
|---|---|
| 톱니 절취선 | **`1px dashed hairline-strong` 한 줄로 축소** — 봉투 정체성의 마지막 흔적 |
| 종이 노이즈 텍스처 | **제거** (flat 원칙) |
| 도장 스탬프 "예상" | **`badge-tag-coral` pill "예상 금액이에요"로 대체** |
| 스탬프 애니메이션 | **제거**. 전환은 150~200ms ease만 |

### 0-2. 근무지 스티키 팔레트 8종

DESIGN-ILGIK의 파스텔은 서로 너무 가깝다(`coral-light` / `brand-red` / `orange-light`가 모두 warm pale). 8개를 구분할 수 없다.

→ 문서 Known Gaps의 *"Sticky note color tints inside the actual whiteboard product are richer than what marketing surfaces capture"*를 근거로 **파스텔 5 + 진한 3**으로 구성해 명도까지 갈랐다. 전부 원본 토큰이다.

| # | 토큰 | 배경 | 글자 |
|---|---|---|---|
| 1 | `brand-yellow` | `#ffd02f` | `#1c1c1e` |
| 2 | `coral-light` | `#ffc6c6` | `#1c1c1e` |
| 3 | `teal-light` | `#c3faf5` | `#1c1c1e` |
| 4 | `brand-rose` | `#ffd8f4` | `#1c1c1e` |
| 5 | `orange-light` | `#ffe6cd` | `#1c1c1e` |
| 6 | `brand-blue` | `#4262ff` | `#ffffff` |
| 7 | `brand-teal` | `#0fbcb0` | `#ffffff` |
| 8 | `ink-deep` | `#050038` | `#ffffff` |

- 전 조합 대비 4.5:1 이상
- 파스텔은 흰 배경에서 경계가 사라지므로 **`rgba(5,0,56,.08)` 1px 테두리 필수**
- 색맹 대응은 **이모지 병행**으로 보강. 색은 보조 단서지 유일한 단서가 아니다

### 0-3. 의도적으로 지키지 않은 규칙 2개

| 규칙 | DESIGN-ILGIK | 이 앱 | 이유 |
|---|---|---|---|
| 터치 타깃 | pill 40~44px | **56px (주 CTA 64px)** | 저문해·현장 장갑 사용자가 대상. 제품 요구가 우선. **형태(pill·radius·색)는 그대로 따른다** |
| Roobert PRO | 전 surface | `font-family` 1순위로 두되 실제 렌더는 **Pretendard** | 한글 글리프 없음 + CDN 로드 불가. Roobert의 기하학적 성격과 가장 가까운 한글 face |

```css
--font: "Roobert PRO", "Pretendard Variable", Pretendard,
        -apple-system, "Apple SD Gothic Neo", "Malgun Gothic",
        "Segoe UI", "Noto Sans", system-ui, sans-serif;
```

### 0-4. 테마

**단일 라이트 테마.** DESIGN-ILGIK가 다크 모드 토큰을 정의하지 않으므로(Known Gaps) 임의로 만들지 않는다. 모든 색을 명시적으로 칠해 OS 테마와 무관하게 동일하게 렌더한다.

---

## 1. 전역 규칙

### 1-1. 치수

| 항목 | 값 |
|---|---|
| 기준 뷰포트 | 375 × 812 (최소 320px까지 미파손) |
| 본문 최소 | 16px |
| 캡션 최소 | 13px (`typography.caption`) |
| 터치 타깃 최소 | **56px** — 언어 선택 행만 68px |
| 주 CTA | **64px 전폭 black pill**, 화면당 최대 1개 |
| 화면 좌우 여백 | 16px |
| 세로 간격 | `spacing.xs` 8 / `spacing.sm` 12 / `spacing.md` 16 / `spacing.lg` 20 만 사용. 임의 margin 금지, `gap` 사용 |

### 1-2. Radius (DESIGN-ILGIK `rounded` 스케일)

| 용도 | 토큰 | 값 |
|---|---|---|
| 모든 버튼 · 칩 · 탭 · 배지 · 세그먼트 | `rounded.full` | 9999px |
| 입력 필드 | `rounded.md` | 8px |
| 리스트 행 · 달력 셀 | `rounded.lg` | 12px |
| 라디오 · 체크 컨테이너 · 요약 바 | `rounded.xl` | 16px |
| **스티키 노트 (근무지)** | `rounded.xxl` | 20px |
| **정산 카드 · 미수금 총액 · 신고 CTA** | `rounded.xxxl` | 28px |
| 바텀시트 상단 | `rounded.feature` | 32px |

### 1-3. Elevation

시스템은 flat이 기본이다.

| 레벨 | 값 | 사용처 |
|---|---|---|
| 0 (flat) | `hairline-soft` 1px, 그림자 없음 | **정산 카드, 리스트 행, 입력, 대부분** |
| 2 (card) | `rgba(5,0,56,.06) 0 4px 12px 0` | **스티키 노트 전용** — 보드에 "붙어 있는" 느낌 |
| 4 (modal) | `rgba(5,0,56,.12) 0 16px 48px -8px` | 바텀시트, 스낵바 |

> 앱에서 그림자를 쓰는 컴포넌트는 **스티키 노트와 시트뿐**이다.

### 1-4. 타이포 매핑

| 역할 | DESIGN-ILGIK 토큰 | 크기 / 굵기 | 색 |
|---|---|---|---|
| 실수령 · 미수금 총액 | `stat-display` 축소 | 48 / 500 / `-1.5px` | `success-accent` / `coral-dark` |
| Step3 일당 | `stat-display` 축소 | 56 / 500 / `-1.8px` | `ink` |
| 앱바 제목 | `heading-4` | 22 / 500 | `ink` |
| 시트 제목 | `heading-5` | 18~20 / 500 | `ink` |
| 리스트 제목 · 라디오 제목 | `body-md-medium` | 16 / 500 | `ink` |
| 본문 | `body-md` | 16 / 400 | `ink` |
| 보조 · 시간 · 날짜 | `body-sm` | 14 / 400 | `slate` / `steel` |
| 라벨 · 배지 | `caption-bold` | 13 / 600 | 문맥색 |
| 스티키 "최근" 배지 | `micro-uppercase` | 11 / 600 / `+0.5px` | 대비색 |

**모든 금액·시간 숫자에 `font-variant-numeric: tabular-nums` 필수.** 세로로 정렬된 숫자가 흔들리면 신뢰가 깨진다.

### 1-5. 접근성

- 대비비 4.5:1 이상 (스티키 8종 전 조합 검증 완료)
- 모든 아이콘 버튼에 `aria-label`
- 포커스 링 `2px solid brand-blue`, `outline-offset: 3px`. 제거 금지
- `prefers-reduced-motion` 준수 — 원래 장식 모션이 없으므로 전환만 비활성
- 색 점에 `aria-hidden`, 근무지명은 항상 텍스트로 존재

---

## 2. 화면별 스펙

### S1. `/welcome` — 언어 선택

| 항목 | 값 |
|---|---|
| 행 | 68px · `rounded.full` · `hairline` 1px · 간격 10px |
| 구성 | 국기 이모지 28px + 자국어 표기 20 / 500 |
| 추정 언어 | `navigator.language` 매칭 → 맨 위 + **`brand-blue` 2px + `featured` 배경** + 체크 아이콘 |
| 로고 | 56px `brand-yellow` 스퀘어 (`rounded.lg`). **앱 안에서 노랑을 크게 쓰는 유일한 자리** |
| 한국어 텍스트 | **0자** |
| Phase 1 | `vi` `km` `ne` `id` `en` `ko` (추정값이 맨 위로 재정렬) |

**동작**
- 탭 즉시 다음 스텝. 확인 버튼 없음
- `settings.locale` 저장 → 선택 언어 폰트만 동적 로드
- 미검수 언어는 우측에 `badge-tag-yellow` "검수중" + 영문 병기

**온보딩 2/3 — 법적 고지**
아이콘 3컷(계산기·서류·전화) + `button-primary` 확인 → `settings.legalNoticeAcceptedAt`. 스킵 불가.

**온보딩 3/3 — 첫 근무지**
회사명만 입력. 시급 10,320 프리필, 색·이모지 자동 배정. 튜토리얼 슬라이드 없음. [건너뛰기] 허용.

---

### S2. `/` — 홈

**세로 순서 (고정)**
```
1. 앱바         월 선택 드롭다운(heading-4) + 설정 button-icon-circular
2. 정산 카드     card-feature 규격, 축약형
3. 미수금 pill   56px coral-light · 미수금 0이면 렌더 안 함
4. 주 CTA       64px black pill "오늘 기록하기"
5. 최근 기록     5건
```

**정산 카드 축약형**
```
받을 돈                          ← body-sm / steel
2,230,291원                     ← 48 / 500 / success-accent / -1.5px
──────────────────────────      ← 1px dashed hairline-strong, margin 0 -20px
세전 합계          2,314,120원   ← body-sm, key-value
공제               −83,829원     ← coral-dark
```
소계·안내박스는 월정산 전용. 홈에는 없다.

**최근 기록 행 (60px, `rounded.lg`)**
```
[스티키 색 사각 14px] [이모지 + 근무지명 16/500] [미지급 chip.coral]   [금액 16/600]
                      [M/D 요일 · N시간 14/400 steel]
```

**상태**
| 조건 | 렌더 |
|---|---|
| 근무지 0 | 정산 카드 대신 안내. CTA를 "근무지 만들기"로 교체 |
| 기록 0 | 정산 카드 0원 + "오늘 일했으면 눌러주세요" |
| 미수금 0 | pill 미표시. 빈 자리 유지 금지, 레이아웃이 위로 붙음 |

---

### S3~S5. `/log/new` — 기록 입력 3스텝 바텀시트

공통: 그랩바 + 시트 헤더(맥락 + 스텝 인디케이터) + 본문 + 푸터. 시트 상단 `rounded.feature` 32px, elevation 4.

> 스텝 인디케이터는 **숫자가 아니라 24×4px 막대 3개**. "1/3"도 못 읽는 사용자를 가정한다.

#### Step 1 — 근무지 (스티키 노트)

| 항목 | 값 |
|---|---|
| radius | `rounded.xxl` 20px — 파스텔 피처 카드(28px)보다 각지게 해서 실물 메모 느낌 |
| elevation | **level 2** `rgba(5,0,56,.06) 0 4px 12px`. 앱에서 그림자를 쓰는 유일한 카드 |
| 최근 사용 1곳 | 맨 위 **전폭 88px**, 이모지 36px, 이름 19/500 |
| 나머지 | 2열 그리드, 최소 112px, 이모지 30px |
| 카드 내용 | 이모지 + 회사명 17/500 + `시급 · 공제방식` 13/400 (opacity .78) |
| "최근" 배지 | `micro-uppercase` 11/600, `rgba(255,255,255,.5)` pill |
| 마지막 | `[+ 새 근무지]` — `hairline-strong` 1px dashed, 그림자 없음 |
| 정렬 | 최근 사용순 자동 (수동 정렬 없음) |

**동작**
- 탭 → **즉시 Step 2** (확인 버튼 없음)
- 날짜는 헤더 표시만. **날짜 선택 UI를 스텝에 넣지 않는다** (스텝 4개가 되면 3탭 원칙이 깨진다). 다른 날은 달력에서 진입
- 근무지 0곳이면 이 스텝을 건너뛰고 생성 폼으로

#### Step 2 — 시간

**⚠️ 기획서 수정 — 휴게시간 처리**

원본은 두 모드 모두에 휴게 칩을 뒀다. 그러면 `12시간` 프리셋을 누른 사용자에게 11시간이 나오고, 사용자는 앱이 틀렸다고 판단한다.

```
[시간만 입력] 모드 (기본)
  → 입력값이 곧 실근로시간. breakMinutes = 0 으로 저장
  → 휴게 칩을 렌더하지 않음
  → 안내: "쉬는 시간 빼고 실제로 일한 시간이에요"

[출퇴근 시각] 모드
  → 휴게 칩 표시 (근무지 defaultBreakMinutes 프리필)
  → 실근로 = (종료−시작) − 휴게
```

| 요소 | 스펙 |
|---|---|
| 세그먼트 | `toggle-monthly-yearly` 규격 — `surface` 지면 + `rounded.full` + padding 4px, 버튼 48px. 활성은 `canvas` + level 2. 마지막 모드를 **근무지별로** 기억 |
| 프리셋 | 4 / 8 / 10 / 12시간, **72px pill 2×2**. `hairline-strong` 1px → 선택 시 `pill-tab-active` (primary 지면 + 흰 글자) |
| 미세조정 | `−30분` / 값 / `+30분` 56px pill. 클램프 30분 ~ 24시간 |
| 특근 토글 | 60px pill. ON → **`coral-light` 지면 + `coral-dark` 글자 + 스위치 `coral-dark`**. 색만으로 인지 |
| 5인 미만 배지 | 근무지 설정 ON이면 `badge-tag-yellow` "가산수당이 없어요" |

**출퇴근 시각 모드 추가 규칙**
- 종료 < 시작 → **"다음날" 칩 자동 표시**, +24h
- 야간(22:00~06:00) 구간 존재 시 야간 칩
- 휴게는 **시간 비례 균등 차감** + "휴게시간은 나눠서 계산했어요" 1줄 고지
- 실근로 < 0 → 저장 차단 `"쉬는 시간이 일한 시간보다 길어요"`

#### Step 3 — 확인

| 요소 | 스펙 |
|---|---|
| 컨테이너 | `card-feature-yellow` 계열 — `surface-yellow` 지면 + `rounded.xxxl`, 중앙 정렬 |
| 일당 | **56 / 500 / `ink` / `-1.8px`**. 실수령이 아니라 **세전 일당** |
| 고지 | `badge-tag-coral` "예상 금액이에요" — 원본 도장 스탬프의 대체 |
| 내역 | 14px. `breakdown[]` 그대로. 배율은 `rounded.full` 모노 칩 (`surface` 지면) |
| 공제 | **표시하지 않음.** "공제는 월 정산에서" 한 줄만 |
| CTA | 64px black pill "저장" |

> **일당 단계에서 공제를 계산하지 않는 이유**: `DAILY_WORKER`는 일 15만원 기준이라 대부분 0원이 나온다. 3.3% 근무지와 나란히 보일 때 오히려 혼란을 준다. 공제는 월 단위 개념으로만 노출한다.

**저장 시퀀스**
```
1) 중복 검사 (같은 date + 같은 workplaceId)
     있으면 → [따로 추가] (기본, 하루 2탕) / [바꾸기]
     다른 근무지면 묻지 않음
2) hourlyWageSnapshot, deductionSnapshot 고정
3) paymentStatus = 'UNPAID'
4) 홈 복귀 (전환 150~200ms ease) + 5초 되돌리기 스낵바
   ※ 원본의 스탬프 애니메이션은 제거 — Miro는 장식 모션을 쓰지 않는다
```

**실시간 반영**: Step 2 값 변경 → Step 3 금액 즉시 갱신. 뒤로가기로 스텝 이동 시 입력값 유지.

---

### S6. `/calendar` — 달력

**상단 요약 바** (`card-base`, `rounded.xl`): `일한 날 / 일한 시간 / 세전` 3분할. **실수령이 아니라 세전** — 실수령은 월정산의 몫.

**셀 (최소 58px, `rounded.md`)**
```
날짜 13 / 500
마커 9×9px rounded.xs  ← 원형 점이 아니라 스티키 미니어처. 여러 건이면 여러 개
시간 10.5 / 500 steel  ← 여러 건이면 합계
```

| 상태 | 표현 |
|---|---|
| 오늘 | `primary` 1px 테두리 |
| 특근·휴일 | **`coral-light` 셀 배경** (마커와 색이 겹치지 않게 지면으로 구분) |
| 미근무 | 배경 없음, 날짜만 `muted`. **탭 가능** (그 날짜로 입력) |
| 일요일 헤더 | `coral-dark` |
| 마커 테두리 | `rgba(5,0,56,.08)` 1px — 파스텔이 흰 배경에서 사라지는 것 방지 |

**동작**
- 월 이동: **좌우 스와이프 + 화살표 버튼 둘 다** (스와이프를 모르는 사용자 존재)
- 날짜 탭 → 그날 기록 시트 → 탭 수정 / 스와이프 삭제
- 삭제는 즉시 실행 금지 → **5초 Undo 스낵바** 후 커밋

**색이 부족해지는 지점**: 근무지 9곳 초과 시 색이 반복된다. 이모지 병행 필수, 상세 시트에는 이름을 텍스트로 노출.

---

### S7. `/summary` — 월간 정산

#### 정산 카드 (`card-feature` 규격)

```css
.env{
  background: var(--canvas);
  border-radius: 28px;               /* rounded.xxxl */
  border: 1px solid var(--hairline-soft);
  padding: 20px;
  /* 그림자 없음 — flat 원칙 */
}
.tear{                                /* 봉투 정체성의 마지막 흔적 */
  border-top: 1px dashed var(--hairline-strong);
  margin: 16px -20px 14px;            /* 카드 폭 전체로 확장 */
}
.est{                                 /* badge-tag-coral */
  position: absolute; top: 18px; right: 18px;
  background: var(--coral-light); color: var(--coral-dark);
  font-size: 13px; font-weight: 600;
  border-radius: 9999px; padding: 4px 10px;
}
```

**표시 위계**
```
[예상 금액이에요]  ← badge-tag-coral, 우상단
받을 돈                          ← 14 / 500 / steel
2,230,291원                     ← 48 / 500 / success-accent / -1.5px
──────────────────────────
세전 합계          2,314,120원
공제               −83,829원     ← coral-dark
──────────────────────────
근무지별 소계 (스티키 색 사각 + 이모지 + 이름 + 일수·시간 + 금액)
                                 comparison-row 규격: hairline-soft 구분선
시간 내역 자세히 보기 ▾
```

**펼침 내용**: 배율별 시간(기본/연장/특근/야간) + 근무지별 공제 내역

**⚠️ 공제 합산 규칙**
```
근무지마다 공제 방식이 다른 것이 정상이다.
월 공제액 = Σ (근무지별 세전 × 근무지별 요율)
전체 세전에 단일 요율을 곱하면 틀린다.
```
(예시 데이터: 삼성전기 3.3% · 한국공업 4대보험 국민연금 제외 4.904% · 대성물류 공제없음)

**하단 안내 박스** (`surface` 지면, `rounded.xl`) — 4줄 전부 번역 + 원어민 검수 대상
```
· 이 금액은 예상이에요. 실제 받는 돈과 다를 수 있어요.
· 같이 일하는 사람이 5명보다 적으면 1.5배 수당이 없어요.
· 일주일에 15시간 넘게 일하면 하루치를 더 받을 권리가 있어요.
· 돈을 못 받으면 1350으로 전화하세요. 통역이 있어요.   ← tel: 링크, ink/600
```

**내보내기**
| Phase | 범위 |
|---|---|
| 1 | 전체 기록 **JSON 백업/복원** 1개 (기기 분실 = 증거 전소 방지) |
| 3 | 정산 카드 PNG · 한국어 병기 A4 PDF · CSV |

---

### S8. `/unpaid` — 못 받은 돈 ★신규

이 앱이 다른 급여계산기와 갈라지는 유일한 화면.

| 요소 | 스펙 |
|---|---|
| 총액 카드 | **`card-feature-coral` 규격** — `coral-light` 지면 + `rounded.xxxl` + padding 20px |
| 총액 | **48 / 500 / `coral-dark` / `-1.5px`** |
| 집계 단위 | **근무지 × 월** (일별로 쪼개지 않음 — 지급도 분쟁도 월 단위) |
| 항목 카드 | `card-base` — `canvas` + `hairline-soft` + `rounded.xl` |
| 지급일 배지 | 대기 = `surface`/`slate` · 경과 = `coral-light`/`coral-dark` + "N일 지났어요". `payDayOfMonth` 기준 자동 |
| 받았어요 | **56px `success-accent` 아웃라인 pill**. 탭 1회 → PAID + 5초 되돌리기 |
| 부분 지급 | 길게 누르기 → 금액 입력 → `PARTIAL` + `paidAmount` |
| 신고 안내 | **`cta-banner-dark` 규격** — `primary` 지면 + `rounded.xxxl` + 72px |

**상태**
| 조건 | 렌더 |
|---|---|
| 미수금 0 | **`teal-light` + `moss-dark`로 "다 받았어요"** 상태 카드. 빈 화면 금지 |
| 지급일 미설정 | 배지 대신 "받는 날을 정해두면 알려드려요" + 근무지 설정 링크 |

**coral을 이만큼 쓰는 근거**: 다른 화면에서 coral은 칩 하나로 절제한다. 이 화면만 총액에 **지면**으로 쓴다. 앱에서 유일하게 "지금 뭔가 잘못되고 있다"고 말해야 하는 화면이기 때문이다.

**톤 규칙**: "이건 불법이에요"라고 쓰지 않는다. "이만큼 못 받았어요"라는 사실만 보여준다. 앱이 사용자를 사업주와의 갈등에 먼저 밀어넣지 않는다.

---

### S9. `/workplaces/:id` — 근무지 만들기 · 수정

앱에서 **유일하게 복잡해도 되는 화면**. 한 번 설정하면 이후 기록이 3탭으로 끝나기 때문.

**필드 순서**
```
1. 색깔과 그림      60px 스티키 프리뷰(rounded.xxl + level 2) + 34px 팔레트
2. 시급             "1시간에 받는 돈" · 10,320 프리필 · text-input 56px
3. 돈을 어떻게 받아요?   라디오 4종
4. 일하는 사람 수    5인 미만 토글 + "켜면 1.5배·2배 수당이 붙지 않아요"
5. 돈 받는 날        payCycle + payDayOfMonth
6. 기본 휴게시간     출퇴근 시각 모드에서만 쓰임을 명시
7. 기타 공제         소개비 · 숙소비 · 식대 · 차비 + 직접 입력
8. 사장님 연락처     선택. 체불 시 필요
```

**공제 방식 라디오** (64px, `rounded.xl`, 선택 시 `pricing-card-featured` 규격 = `brand-blue` 2px + `featured` 배경)

| ID | 제목 (16/500) | 설명 (13/400 steel) |
|---|---|---|
| `RATE_3_3` | 3.3% 떼는 곳 | 인력사무소 · 일용직. 4대보험 없음 — **기본 선택** |
| `DAILY_WORKER` | 일용직으로 신고하는 곳 | 하루 15만원 아래면 세금이 없어요 |
| `INSURANCE_4` | 4대보험 내는 곳 | 정식 근로계약 → 체크박스 3종 펼침 |
| `NONE` | 전액 받는 곳 | 현금 지급, 떼는 것 없음 |

**보험 체크박스** (`surface` 지면, `rounded.xl`)
```
[ ] 국민연금 떼요
[✓] 건강보험 떼요
[✓] 고용보험 떼요           [ 4.904% ]  ← badge-tag-yellow, 실시간 갱신
```

> 국민연금은 **상호주의**라 캄보디아·네팔·미얀마·태국 등은 당연적용 대상이 아니고, E-9은 고용보험도 임의가입이다. **9.4% 일괄 적용은 최대 사용자군에서 틀린다.**
> 국적 판정 로직을 앱에 넣으면 법령 해석 책임을 지게 되므로, 사용자가 **급여명세서를 보고 체크만** 하게 한다.

**기타 공제**
- 모드: `PER_DAY` / `PER_MONTH` / `RATE`
- 인력사무소는 일당의 8~10%를 소개비로 뗀다. 이게 빠지면 앱 금액과 실제 봉투가 안 맞고, **사용자는 앱이 틀렸다고 판단한다**

**삭제 대신 보관**
- 삭제 버튼은 **존재하지 않는다**. 외래키가 깨지고 증거가 사라진다
- "이제 여기 안 나가요" = `isArchived`. 목록에서 숨고 과거 기록은 유지
- 시급·공제방식을 수정해도 **과거 기록 금액은 절대 바뀌지 않는다** (`hourlyWageSnapshot` · `deductionSnapshot`)

---

## 3. 다국어 레이아웃 대응

| 리스크 | 대응 |
|---|---|
| 문자열 길이 폭증 (id·en은 한국어 대비 1.5~2배) | 버튼 텍스트 2줄 허용, `min-height` 고정 + `height` 금지 |
| 크메르어·네팔어 상하 여백 | `line-height: 1.5` 이상 (DESIGN-ILGIK body 기본값), 세로 클리핑 검사 필수 |
| pill 버튼 + 긴 문자열 | `rounded.full`은 높이 기준이므로 텍스트가 길어져도 형태 유지. 좌우 padding 24px 확보 |
| 숫자 | `Intl.NumberFormat(locale, {style:'currency', currency:'KRW'})`. **통화 KRW 고정** |
| 날짜 | `Intl.DateTimeFormat`. 요일 약어는 달력 헤더에서 1~2자 truncate |
| 폰트 | 선택 언어 1종만 preload. `km`→Noto Sans Khmer, `ne`→Devanagari |

**검증**: 6개 언어 각각으로 전 화면을 320px 폭에서 렌더해 오버플로 0 확인.

---

## 4. 구현 순서 (Phase 1)

```
1) 토큰 + 프리미티브     pill button / card / row / sheet / chip / badge
2) 스티키 노트 컴포넌트   8색 팔레트 + level 2 그림자. 단독으로 완성
3) S9 근무지 폼          데이터 없으면 아무것도 못 함
4) S3~S5 입력 3스텝      앱의 심장
5) S2 홈                 2·3·4의 조합
6) S6 달력
7) S7 월정산
8) S8 미수금
9) S1 온보딩 + 다국어    마지막. 문자열이 확정된 후 번역
```

---

## 5. 검수 체크 (UI 한정)

**DESIGN-ILGIK 준수**
- [ ] 주 CTA가 전부 `primary #1c1c1e` black pill이다 (노랑 CTA 0개)
- [ ] `brand-yellow`가 로고 마크와 태그 칩에만 쓰였다
- [ ] 모든 버튼·칩·탭·배지가 `rounded.full`이다
- [ ] `font-weight: 700` 이상이 코드에 0건이다
- [ ] 그림자를 쓰는 컴포넌트가 스티키 노트와 시트뿐이다
- [ ] 시스템에 없는 색이 도입되지 않았다 (`#16233A` `#F5C518` `#E8590C` `#0E9F6E` 잔존 0건)

**제품 요구**
- [ ] 전 화면 터치 타깃 56px 이상 (언어 선택 68px, 주 CTA 64px)
- [ ] 모든 금액에 `tabular-nums`가 적용됐다
- [ ] 근무지 식별이 색 단독이 아니라 색 + 이모지다
- [ ] 스티키 8색 전 조합이 대비 4.5:1을 넘는다
- [ ] 파스텔 마커에 `rgba(5,0,56,.08)` 테두리가 있다
- [ ] 6개 언어 × 320px 폭에서 오버플로가 없다
- [ ] 삭제 동작에 전부 5초 Undo가 붙어 있다
- [ ] "예상 금액이에요" 고지가 Step 3와 월정산 양쪽에 있다
- [ ] 근무지 화면에 삭제 버튼이 없다

---

*작성 2026-08-11 · 기획서 v1.0 + DESIGN-ILGIK.md 기준*
