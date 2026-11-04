import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { BUSINESS_INFO } from '../data/business';
import { filterApprovedEntries } from '../lib/content/filter';

const PUBLIC_STATIC_PATHS = [
  '/',
  '/about/',
  '/consultation/',
  '/booking/',
  '/visit/',
  '/saju/',
  '/faq/',
  '/articles/',
  '/notices/',
  '/privacy/',
  '/terms/',
];

export const GET: APIRoute = async () => {
  const rawArticles = await getCollection('articles');
  const rawNotices = await getCollection('notices');

  const approvedArticles = filterApprovedEntries(rawArticles);
  const approvedNotices = filterApprovedEntries(rawNotices);

  const urls: string[] = [
    ...PUBLIC_STATIC_PATHS.map((p) => new URL(p, BUSINESS_INFO.siteUrl).toString()),
    ...approvedArticles.map((a) => new URL(`/articles/${a.id}/`, BUSINESS_INFO.siteUrl).toString()),
    ...approvedNotices.map((n) => new URL(`/notices/${n.id}/`, BUSINESS_INFO.siteUrl).toString()),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
