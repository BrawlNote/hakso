import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const reviewStatusEnum = z.enum(['draft', 'pending', 'approved']);

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    draft: z.boolean().default(true),
    reviewStatus: reviewStatusEnum.default('draft'),
    author: z.string().min(1),
    /** 실제 운영자 검수 완료 시에만 기입하며, 미검수 초안은 빈 문자열("")로 유지 */
    reviewer: z.string().default(''),
    category: z.enum(['상담 준비', '만세력·명리 기초', '상담 안내']),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

const notices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notices' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    draft: z.boolean().default(true),
    reviewStatus: reviewStatusEnum.default('draft'),
    author: z.string().min(1),
    reviewer: z.string().default(''),
    category: z.enum(['운영 안내', '일정 공지']).default('운영 안내'),
  }),
});

export const collections = {
  articles,
  notices,
};
