# 학소 철학관 홈페이지 운영·관리 가이드 (OPERATIONS)

작성·갱신일: 2026-11-04 · 기준 범위: A(홍보·이메일 상담 안내) + B(무료 기본 사주 체험)

이 문서는 macOS 개발·운영 환경에서 학소 철학관 홈페이지를 실행·수정·검수·배포하는 방법을 안내한다. 실제 비밀 키나 개인 생년월일 데이터는 본 문서 및 저장소에 포함하지 않는다.

---

## 1. macOS 로컬 실행 절차

```bash
# 1) 저장소 폴더 이동 및 Node 버전 확인 (.nvmrc: 24.18.1)
cd /Users/daeinlee/Desktop/src/hakso
node -v
npm -v

# 2) 의존성 재현 설치 (package-lock.json 기준)
npm ci

# 3) 로컬 개발 서버 실행 (http://localhost:4321)
npm run dev

# 4) 전체 품질·계산·콘텐츠·보안·E2E 검수
npm run check
npm run build
npm test
npm run test:saju
npm run test:content
npm run test:security
npm run test:e2e
```

---

## 2. 사업 정보 및 상담 이메일 반영 방법 (추후 정보 확정 시)

모든 사업 기본 정보는 `src/data/business.ts` 한 곳에서 관리한다.

1. **대표자 성명 반영**:
   - `src/data/business.ts`의 `representativeName: ''`에 확정된 대표자 성명을 입력한다.
   - 값이 입력되면 푸터(`src/components/Footer.astro`)와 학소 소개 페이지(`src/pages/about/index.astro`)에 `대표` 항목이 자동으로 노출된다.
2. **상담 이메일 주소 반영 (이메일 상담 개시)**:
   - `src/data/business.ts`의 `consultationEmail: ''`에 실제 수신 이메일 주소를 입력한다.
   - 유효한 이메일이 입력되면 사이트 전체의 `"이메일 상담 준비 중"` 배지가 `"이메일 상담 운영 중"`으로 전환되고, 메일 작성 연결(`mailto:`) 버튼과 `"이메일 주소 복사"` 버튼이 자동으로 활성화된다.
   - 반영 후 반드시 `npm test` 및 모바일 실기기에서 메일 앱 연결과 주소 복사 동작을 확인한다.
3. **소재지 안내 변경**:
   - 현재 확정 주소(`서울 강북구 한천로 1167 3층`)는 `BUSINESS_INFO.address`에 설정되어 있으며, `visitReceptionOpen: false`를 통해 현장 방문 접수를 받지 않음을 명시하고 있다.

---

## 3. 칼럼·공지사항 발행 및 초안 관리

- 칼럼 파일 위치: `src/content/articles/*.md`
- 공지 파일 위치: `src/content/notices/*.md`
- **공개 조건**: 프런트매터(frontmatter)에서 `draft: false`이고 `reviewStatus: "approved"`이며 `reviewer`에 실제 검수자 호칭이 입력된 문서만 목록·상세·사이트맵(`/sitemap.xml`)에 공개된다.
- 미검수 초안(`draft: true` 또는 `reviewStatus: "draft"`)은 공개 빌드(`dist/`)에 생성되지 않으며, `npm run test:security`가 이를 자동으로 검증한다.

---

## 4. 사주 계산 정책 및 기본 풀이 원고 수정 절차

- 계산 정책 및 만세력 래퍼: `src/lib/saju/engine.ts`, `src/lib/saju/korea-time.ts`
- 기본 풀이 원고: `src/lib/saju/interpretations.ts`
- 계산 정책이나 원고를 변경할 때는 다음 절차를 따른다:
  1. `calculationPolicyVersion` 버전 식별자 갱신 검토 (현재 기본안: `hakso-draft-v1`).
  2. `npm run test:saju`를 실행하여 65개 이상의 기준·경계 사례(입춘, 12절, 자시 경계, 시간 미상, 과거 표준시·서머타임, 음력 윤달)가 모두 통과하는지 확인.
  3. 운영자 원고 검수가 최종 완료되면 `contentStatus` 표기를 정식 검수 완료 상태로 전환.

---

## 5. 사주 침투·무단 복제·스크래핑 방어 계층

1. **외부 iframe 임베딩 및 리소스 도용 차단**:
   - `public/_headers` 및 `src/layouts/SiteLayout.astro`의 CSP(`frame-ancestors 'none'`), `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin` 및 프레임 탈출 스크립트로 외부 사이트가 `/saju/`를 위젯처럼 도용하는 것을 차단한다.
2. **URL 쿼리 핫링크 및 캐시 차단**:
   - `/saju/`에 `?year=...` 등 쿼리 파라미터로 접근 시 즉시 쿼리를 제거하며, `Cache-Control: no-store` 및 `noarchive, nosnippet`을 적용한다.
3. **자동화 스크래퍼 및 무단 복사 방지**:
   - 숨겨진 허니팟 필드(`#saju-hp-website`)와 세션 내 단기 연속 계산 상한(분당 25회)으로 매크로 수집을 방어한다.
   - 결과 영역(`#saju-result-step`)에 선택 방지(`user-select: none`), 복사(`copy`)·잘라내기(`cut`)·우클릭(`contextmenu`) 가로채기, 인쇄(`@media print`) 시 본문 숨김을 적용한다.
4. **구조적 한계 및 후속 확장 경로**:
   - 정적 브라우저 번들 특성상 개발자 도구를 통한 번들 열람 자체를 100% 암호학적으로 은닉할 수는 없다. 추후 원고 데이터의 완전한 서버 비공개가 필요할 경우 Cloudflare Worker 동일 출처 엔드포인트로 해석 원고 조회를 분리할 수 있다.

---

## 6. 미리보기 및 운영 배포 / 롤백

- **미리보기 배포**: `npm run deploy:preview` (`hakso-preview` 대상)
- **운영 배포**: 운영 정보(대표/이메일/계산 기준/도메인) 확정 및 사용자 공개 요청 후 `CONFIRM_PRODUCTION_DEPLOY=true npm run deploy:production` 실행 (`guard-production-deploy.mjs`가 미승인 운영 배포를 사전 차단함).
- **장애 시 롤백**: `wrangler rollback` 또는 이전 정상 Git SHA 커밋에서 재빌드·재배포.
- **유료 AI 기능 상태**: 현재 후속 계획(C) 단계로 AI 코드 및 외부 유료 API 호출이 전혀 존재하지 않으므로 과금 위험이 없다.
