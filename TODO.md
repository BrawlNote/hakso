# 학소 철학관 정식 오픈 전 필수 작업 목록 (DO / TODO)

작성일: 2026-11-05

정식 오픈(런칭) 시 **반드시 해제·반영해야 하는 항목**을 누락하지 않도록 정리한 실행 체크리스트입니다.

---

## 1. [최우선 필수] 검색엔진 비노출(`noindex`) 해제 및 검색 등록

현재 외부 테스트용으로 열어둔 GitHub Pages(`https://brawlnote.github.io/hakso/`)는 테스트 기간 중 검색엔진에 임시 주소가 수집되지 않도록 `PREVIEW_NOINDEX: "true"`가 걸려 있습니다. **정식 오픈 시 반드시 아래 절차를 수행해야 검색엔진(네이버·구글·다음)에 노출됩니다.**

### 1-1. 해제 방법
- **경우 A: GitHub Pages에서 검색엔진 노출을 바로 허용할 때**
  1. [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) 파일의 37번째 줄 `PREVIEW_NOINDEX: "true"`를 **`PREVIEW_NOINDEX: "false"`** (또는 해당 줄 삭제)로 변경 후 커밋·푸시합니다.
  2. 배포 완료 후 페이지 소스에서 `<meta name="robots" content="index,follow">`로 출력되는지 확인합니다.
  *(참고: `/saju/` 결과 영역은 개인 사주 결과 스니펫 유출 방지를 위해 `noarchive, nosnippet`만 유지되고 페이지 색인(`index,follow`)은 정상 허용됩니다.)*

- **경우 B: 추후 클라우드플레어(Cloudflare) 및 정식 도메인으로 이전해 오픈할 때**
  1. 기본 빌드(`npm run build`)는 원래부터 `<meta name="robots" content="index,follow">`로 빌드되므로, 클라우드플레어 운영 배포 시 자동으로 검색엔진 수집이 허용됩니다.
  2.[`src/data/business.ts`](./src/data/business.ts)의 `siteUrl`과 [`public/robots.txt`](./public/robots.txt)의 `Sitemap:` 주소를 실제 구매한 정식 도메인으로 맞춥니다.
  3. 정식 도메인 오픈 후에는 임시 테스트용이었던 GitHub Pages를 끄거나 `PREVIEW_NOINDEX: "true"` 상태로 두어 중복 문서 수집을 방지합니다.

### 1-2. 검색엔진 웹마스터 도구 등록
- [ ] **네이버 서치어드바이저 (Naver Search Advisor)**: 사이트 소유 확인 후 `/sitemap.xml` 및 `/robots.txt` 제출
- [ ] **구글 서치콘솔 (Google Search Console)**: 도메인/URL 속성 등록 후 `/sitemap.xml` 제출

---

## 2. 사업자·상담 운영 정보 입력

- [ ] **대표자 성명 입력**: [`src/data/business.ts`](./src/data/business.ts)의 `representativeName: ''`에 성명 입력 (푸터·소개 페이지에 자동 표시됨)
- [ ] **상담 전용 이메일 입력**: [`src/data/business.ts`](./src/data/business.ts)의 `consultationEmail: ''`에 실제 이메일 입력 (`"이메일 상담 준비 중"` 배지가 `"이메일 상담 운영 중"`으로 자동 전환되고 `mailto:` 및 주소 복사 버튼이 활성화됨)
- [ ] **이메일 상담 비용·회신 기한 확정**: [`src/data/business.ts`](./src/data/business.ts)의 `pricingPolicy.emailConsultation` 문구 갱신

---

## 3. 대문 비주얼 및 갤러리 실제 사진 교체

- [ ] 학소 철학관 실제 공간·서재 사진 촬영 후 [`public/images/gallery/`](./public/images/gallery)에 이미지 파일 추가
- [ ] [`src/data/gallery.ts`](./src/data/gallery.ts)의 `HERO_BANNER_IMAGE` 및 `GALLERY_ITEMS` 경로·설명 갱신 및 `"시안 일러스트"` 배지 해제

---

## 4. 클라우드플레어(Cloudflare) 연동 (추후 설정 시)

- [ ] Cloudflare 계정 로그인 (`npx wrangler login`) 및 정식 도메인 연결
- [ ] 미리보기 배포 확인 (`npm run deploy:preview`) 후 운영 배포 (`CONFIRM_PRODUCTION_DEPLOY=true npm run deploy:production`)
