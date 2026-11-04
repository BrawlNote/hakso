import { defineConfig } from 'astro/config';

const siteUrl = process.env.SITE_URL || 'https://hakso.kr';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
});
