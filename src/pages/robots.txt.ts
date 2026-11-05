import type { APIRoute } from 'astro';
import { BUSINESS_INFO } from '../data/business';

export const GET: APIRoute = () => {
  const isPreview = import.meta.env.PUBLIC_DEPLOY_ENV === 'preview';
  const sitemapUrl = new URL('/sitemap.xml', BUSINESS_INFO.siteUrl).toString();

  const body = isPreview
    ? `User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /

# 무단 AI 학습 및 대량 스크래핑 봇 차단
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
