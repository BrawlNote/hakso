# 학소 철학관 구현 진행 기록 (PROGRESS)

작성·갱신일: 2026-11-04 · 작업 브랜치: `main` (`https://github.com/BrawlNote/hakso.git`)

## 1. 초기 점검 및 환경 요약 (Stage 00)

- **작업 경로**: `/Users/daeinlee/Desktop/src/hakso` (macOS `arm64`, macOS `27.0.1`, Node `v24.18.1`, npm `11.16.0`, Git `2.55.0`, Safari `27.0.1`)
- **기존 파일 보존**: `README.md`, `ANTIGRAVITY_WORK_ORDER.md`, `docs/01_REQUIREMENTS.md` ~ `docs/04_OWNER_CHECKLIST.md` 원본 보존 완료.
- **확정 범위 및 추가 요구사항 반영**:
  - 소재지: `서울 강북구 한천로 1167 3층` (현장 방문 접수 아님, 초기 이메일 상담만 진행)
  - 대표 정보·상담 이메일 주소: 공란 유지 (`""`), 빈 레이블 숨김, 이메일 미제공 시 “이메일 상담 준비 중” 안내 및 `mailto:` 생성 원천 차단
  - 홈페이지 사주 체험: 무료 기본 풀이만 제공 (이메일 상담 요금은 별도 미정으로 안내)
  - 유료 AI 풀이(C): 후속 계획만 유지, 초기 AI API·결제·비용 저장소·유료 버튼 미구현
  - 사주 침투·무단 복제·퍼가기 방지: HTTP 보안 헤더(`X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `CORP: same-origin`), AI 스크래퍼 `robots.txt` 차단, `/saju/` `noarchive/nosnippet` 및 `Cache-Control: no-store`, URL 쿼리 파라미터 자동 제거, 허니팟(`#saju-hp-website`) 및 분당 레이트 가드, 클로저 상태 격리, 결과 영역 무단 복사/우클릭/인쇄 차단 구현 완료.

## 2. 단계별 완료 상태

| 단계 | 작업 내용 | 상태 | 산출물 / 검증 근거 |
| --- | --- | --- | --- |
| 00 | 맥 작업 공간·자료·기존 변경 점검 | 완료 | `docs/PROGRESS.md`, `docs/DECISIONS.md` |
| 01 | 사업·콘텐츠 구조와 기술 결정 | 완료 | `src/data/business.ts`, `src/data/consultation.ts`, `src/data/faq.ts`, `docs/DECISIONS.md` |
| 02 | 디자인·와이어프레임 | 완료 | `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/SiteLayout.astro` |
| 03 | Astro·도구·CI 기반 | 완료 | `.nvmrc`, `.env.example`, `package.json`, `package-lock.json`, `astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` |
| 04 | 홍보 페이지·공통 UI·대문 비주얼·갤러리 | 완료 | `src/components/*`, `/`(대문 비주얼 + 갤러리 미리보기), `/gallery/`(분류 필터 + 라이트박스), `/about/`, `/consultation/`, `/booking/`, `/visit/`, `/faq/`, `/articles/`, `/notices/`, `/privacy/`, `/terms/`, `/404.astro` |
| 05 | 콘텐츠·이메일 상담 안내 | 완료 | 소재지 반영, 대표/이메일 공란 숨김 및 준비 중 분기, `src/content.config.ts`, `src/lib/content/filter.ts` |
| 06 | SEO·정책·A 미리보기 | 완료 | `src/pages/sitemap.xml.ts`, `public/robots.txt`, `public/_headers`, `scripts/verify-security.mjs` |
| 07 | 만세력 후보·정책 비교 실험 | 완료 | `manseryeok@2.0.0` 선정 및 KASI `korean-lunar-calendar` 47,846일 전수 대조·`astronomy-engine` 절입 대조 (`docs/DECISIONS.md`) |
| 08 | 공유 계산 모듈·기본 풀이 | 완료 | `src/lib/saju/` (`types.ts`, `korea-time.ts`, `interpretations.ts`, `engine.ts`, `index.ts`), `tests/unit/saju.test.ts` (68개 테스트 통과) |
| 09 | 사주 입력·결과 화면 | 완료 | `src/pages/saju/index.astro` (입력→확인→결과 3단계, 브라우저 메모리 단독 처리, 침투/복제/스크래핑 방어) |
| 10 | A+B 통합·Mac 검수 | 완료 | `check`, `build`, `test` (78건), `test:security` (26개 산출물), `test:e2e` (Chromium + WebKit 14건 통과), `docs/TEST_EVIDENCE.md`, `docs/OPERATIONS.md` |
| 11~13 | 후속 유료 AI 풀이 (C) | 후속 계획만 (미착수) | 사용자 지시에 따라 초기 구현 제외 |
| 14~15 | 운영 공개·전달 | 운영 정보 확정 대기 | 대표자명·상담 이메일·학소 계산 기준 최종 확정 및 배포 요청 시 실행 |

## 3. 남은 미정 결정 및 다음 첫 행동

1. **운영자 확정 대기 항목 (`docs/DECISIONS.md` 5절)**:
   - 대표자 성명 및 상담용 이메일 주소 (`src/data/business.ts`에 반영할 값)
   - 이메일 상담 세부 비용·회신 기한 정책
   - 사주 계산 정책 기본안(`hakso-draft-v1`) 및 기본 풀이 문구 최종 검수
2. **미검증 항목**:
   - 실제 물리 iPhone (iOS Safari) 및 Android (Chrome) 실기기 터치/메일 앱 연결 검수 (상담 이메일 제공 및 미리보기/운영 배포 후 진행)
   - Cloudflare 원격 배포 (`wrangler deploy --env preview` / `production`) — Cloudflare 계정 인증 및 사용자 배포 지시 후 실행
