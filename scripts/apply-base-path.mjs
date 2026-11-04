import fs from 'node:fs';
import path from 'node:path';

const rawBase = (process.env.BASE_PATH || '').trim().replace(/\/+$/, '');

if (!rawBase || rawBase === '/') {
  console.log('[BASE-PATH] 기본 루트(/) 경로이므로 별도 치환 없이 종료합니다.');
  process.exit(0);
}

const basePrefix = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
const distDir = path.resolve(process.cwd(), 'dist');

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

const escapedBase = basePrefix.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attrRegex = new RegExp(`(href|src)=(["'])\\/(?!${escapedBase}(\\/|["'])|\\/)`, 'g');
const galleryPathRegex = new RegExp(`(["'])\\/images\\/gallery\\/`, 'g');

let updatedCount = 0;
for (const file of walkFiles(distDir)) {
  if (!/\.(html|js|css)$/i.test(file)) continue;
  const original = fs.readFileSync(file, 'utf8');
  let next = original.replace(attrRegex, `$1=$2${basePrefix}/`).replace(galleryPathRegex, `$1${basePrefix}/images/gallery/`);

  // GitHub Pages 외부 테스트 배포 시 검색엔진 노출(인덱싱) 방지
  if (process.env.PREVIEW_NOINDEX === 'true' && file.endsWith('.html')) {
    next = next.replace(
      /<meta name="robots" content="index,follow">/g,
      '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">',
    );
  }

  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    updatedCount += 1;
  }
}

console.log(`[BASE-PATH] ${basePrefix} 경로 치환 완료 (${updatedCount}개 파일 업데이트).`);
