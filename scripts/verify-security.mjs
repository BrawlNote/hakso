import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[SECURITY FAIL] dist/ 폴더가 없습니다. 먼저 npm run build를 실행해 주세요.');
  process.exit(1);
}

const requiredFiles = [
  'index.html',
  'about/index.html',
  'consultation/index.html',
  'booking/index.html',
  'visit/index.html',
  'saju/index.html',
  'faq/index.html',
  'articles/index.html',
  'notices/index.html',
  'privacy/index.html',
  'terms/index.html',
  '404.html',
  'sitemap.xml',
  'robots.txt',
  '_headers',
];

for (const rel of requiredFiles) {
  const full = path.join(distDir, rel);
  if (!fs.existsSync(full)) {
    console.error(`[SECURITY FAIL] 필수 빌드 산출물이 누락되었습니다: ${rel}`);
    process.exit(1);
  }
}

// 1. 미승인 초안(draft) 파일이 dist나 sitemap.xml에 유출되었는지 검증
const forbiddenDraftSlugs = ['preparation-guide', 'unknown-birth-time', 'opening-preparation'];
const sitemapXml = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

for (const slug of forbiddenDraftSlugs) {
  if (sitemapXml.includes(slug)) {
    console.error(`[SECURITY FAIL] 미승인 초안(${slug})이 sitemap.xml에 유출되었습니다.`);
    process.exit(1);
  }
  const articleDraftPath = path.join(distDir, 'articles', slug, 'index.html');
  const noticeDraftPath = path.join(distDir, 'notices', slug, 'index.html');
  if (fs.existsSync(articleDraftPath) || fs.existsSync(noticeDraftPath)) {
    console.error(`[SECURITY FAIL] 미승인 초안(${slug}) 상세 페이지가 dist/에 생성되었습니다.`);
    process.exit(1);
  }
}

// 2. 전체 HTML/JS/XML 산출물 순회하며 비밀키·빈 mailto·임시 문구·금지 패턴 검사
function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const allDistFiles = walkFiles(distDir);
const forbiddenPatterns = [
  { regex: /href=["']mailto:\s*(\?|["'])/i, label: '빈 mailto: 링크 생성 금지 위반' },
  { regex: /\b(TBD|TODO|FIXME)\b/, label: '미완성 표기(TBD/TODO/FIXME) 노출' },
  { regex: /(OPENAI_API_KEY|ANTHROPIC_API_KEY|TURNSTILE_SECRET_KEY|sk-[a-zA-Z0-9]{20,})/, label: '비밀 API 키 노출 의심' },
  { regex: /010-\d{3,4}-\d{4}/, label: '확인되지 않은 임시 휴대전화 번호 노출' },
  { regex: /[a-zA-Z0-9._%+-]+@(example\.com|test\.com)/i, label: '가짜 예시 이메일 주소 노출' },
];

for (const file of allDistFiles) {
  if (!/\.(html|js|css|xml|txt|json)$/i.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const rule of forbiddenPatterns) {
    if (rule.regex.test(content)) {
      console.error(`[SECURITY FAIL] ${path.relative(distDir, file)}: ${rule.label}`);
      process.exit(1);
    }
  }
}

// 3. _headers 및 /saju/ 보호 설정 검증 (침투·퍼가기·스크래핑 방지 확인)
const headersContent = fs.readFileSync(path.join(distDir, '_headers'), 'utf8');
const requiredHeaderTokens = [
  'X-Frame-Options: DENY',
  'X-Content-Type-Options: nosniff',
  "frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy: same-origin',
  'Cache-Control: no-store',
];

for (const token of requiredHeaderTokens) {
  if (!headersContent.includes(token)) {
    console.error(`[SECURITY FAIL] _headers 파일에 필수 보안 헤더(${token})가 누락되었습니다.`);
    process.exit(1);
  }
}

const sajuHtml = fs.readFileSync(path.join(distDir, 'saju/index.html'), 'utf8');
if (!sajuHtml.includes('noarchive, nosnippet') || !sajuHtml.includes('data-protected-content="true"') || !sajuHtml.includes('saju-hp-website')) {
  console.error('[SECURITY FAIL] /saju/index.html에 무단 스크래핑·복제 방지 속성이 누락되었습니다.');
  process.exit(1);
}

console.log(`[SECURITY PASS] 총 ${allDistFiles.length}개 빌드 산출물 보안·초안 차단·침투/퍼가기 방지 검증 통과.`);
