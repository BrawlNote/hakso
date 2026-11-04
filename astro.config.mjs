import { defineConfig } from 'astro/config';

const siteUrl = process.env.SITE_URL || 'https://hakso.kr';
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  site: siteUrl,
  base: basePath,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
});
