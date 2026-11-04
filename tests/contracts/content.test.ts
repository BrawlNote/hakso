import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_INFO,
  getSafeMailtoHref,
  getVisibleBusinessFacts,
  hasConsultationEmail,
  hasRepresentativeName,
} from '../../src/data/business';
import { CONSULTATION_TOPICS, EMAIL_CONSULTATION_STEPS } from '../../src/data/consultation';
import { FAQ_ITEMS } from '../../src/data/faq';
import { sanitizeAnalyticsEvent } from '../../src/lib/analytics/events';
import { filterApprovedEntries, isPubliclyApproved, type ContentEntryLike } from '../../src/lib/content/filter';

describe('사업 정보 및 이메일 공란 분기 계약 (Stage 01, 05)', () => {
  it('확정된 소재지(서울 강북구 한천로 1167 3층)와 초기 이메일 상담 전용 설정을 유지한다', () => {
    expect(BUSINESS_INFO.name).toBe('학소 철학관');
    expect(BUSINESS_INFO.address.full).toBe('서울 강북구 한천로 1167 3층');
    expect(BUSINESS_INFO.address.visitReceptionOpen).toBe(false);
    expect(BUSINESS_INFO.consultationMode).toBe('email');
    expect(BUSINESS_INFO.pricingPolicy.webSaju).toBe('무료 제공');
  });

  it('대표자명과 상담 이메일은 현재 공란("")이며, 빈 레이블과 빈 mailto를 생성하지 않는다', () => {
    expect(BUSINESS_INFO.representativeName).toBe('');
    expect(BUSINESS_INFO.consultationEmail).toBe('');
    expect(hasRepresentativeName(BUSINESS_INFO)).toBe(false);
    expect(hasConsultationEmail(BUSINESS_INFO)).toBe(false);
    expect(getSafeMailtoHref(BUSINESS_INFO)).toBeNull();

    const visibleFacts = getVisibleBusinessFacts(BUSINESS_INFO);
    const labels = visibleFacts.map((f) => f.label);
    expect(labels).toContain('상호');
    expect(labels).toContain('소재지');
    expect(labels).not.toContain('대표');
    expect(labels).not.toContain('상담 이메일');
    for (const fact of visibleFacts) {
      expect(fact.value.trim().length).toBeGreaterThan(0);
    }
  });

  it('추후 대표자명과 이메일 주소가 제공되면 자동으로 표시 항목과 mailto 링크를 활성화한다', () => {
    const mockInfo = {
      ...BUSINESS_INFO,
      representativeName: '홍길동',
      consultationEmail: 'consult@hakso.kr',
    };
    expect(hasRepresentativeName(mockInfo)).toBe(true);
    expect(hasConsultationEmail(mockInfo)).toBe(true);
    expect(getSafeMailtoHref(mockInfo)).toContain('mailto:consult@hakso.kr?subject=');

    const visibleFacts = getVisibleBusinessFacts(mockInfo);
    const labels = visibleFacts.map((f) => f.label);
    expect(labels).toContain('대표');
    expect(labels).toContain('상담 이메일');
  });

  it('상담 안내와 FAQ에 허구 경력·단정적 예언·이메일 상담 무료 오인 문구가 없다', () => {
    expect(CONSULTATION_TOPICS.length).toBeGreaterThanOrEqual(4);
    expect(EMAIL_CONSULTATION_STEPS.length).toBe(4);
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);

    const combinedText = JSON.stringify({ BUSINESS_INFO, CONSULTATION_TOPICS, EMAIL_CONSULTATION_STEPS, FAQ_ITEMS });
    expect(combinedText).not.toMatch(/100%\s*적중|무조건\s*성공|이메일\s*상담은\s*무료로\s*제공/);
  });
});

describe('콘텐츠 초안(draft) 및 검수 상태 필터링 계약', () => {
  it('draft=false 이고 reviewStatus=approved 이며 reviewer가 기재된 항목만 공개 승인한다', () => {
    expect(
      isPubliclyApproved({
        title: '초안 글',
        description: '설명',
        publishedAt: '2026-11-04',
        draft: true,
        reviewStatus: 'draft',
        author: '작성자',
        reviewer: '',
      }),
    ).toBe(false);

    expect(
      isPubliclyApproved({
        title: '검수자 누락 글',
        description: '설명',
        publishedAt: '2026-11-04',
        draft: false,
        reviewStatus: 'approved',
        author: '작성자',
        reviewer: '   ',
      }),
    ).toBe(false);

    expect(
      isPubliclyApproved({
        title: '정식 검수 완료 글',
        description: '설명',
        publishedAt: '2026-11-04',
        draft: false,
        reviewStatus: 'approved',
        author: '작성자',
        reviewer: '학소 운영자',
      }),
    ).toBe(true);
  });

  it('filterApprovedEntries는 미승인 항목을 모두 제외하고 발행일 역순으로 정렬한다', () => {
    const entries: ContentEntryLike[] = [
      {
        id: 'draft-1',
        data: {
          title: '초안 1',
          description: '설명',
          publishedAt: '2026-11-04',
          draft: true,
          reviewStatus: 'draft',
          author: '초안',
          reviewer: '',
        },
      },
      {
        id: 'approved-old',
        data: {
          title: '승인 구버전',
          description: '설명',
          publishedAt: '2026-10-01',
          draft: false,
          reviewStatus: 'approved',
          author: '학소',
          reviewer: '학소 운영자',
        },
      },
      {
        id: 'approved-new',
        data: {
          title: '승인 신버전',
          description: '설명',
          publishedAt: '2026-11-01',
          draft: false,
          reviewStatus: 'approved',
          author: '학소',
          reviewer: '학소 운영자',
        },
      },
    ];

    const filtered = filterApprovedEntries(entries);
    expect(filtered.map((e) => e.id)).toEqual(['approved-new', 'approved-old']);
  });

  it('저장소 내 미검수 마크다운 파일들이 임의로 approved 처리되어 있지 않은지 확인한다', () => {
    const articlesDir = path.resolve(process.cwd(), 'src/content/articles');
    const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
      if (raw.includes('reviewStatus: "approved"')) {
        // 만약 approved라면 반드시 비어 있지 않은 reviewer가 있어야 함
        expect(raw).not.toContain('reviewer: ""');
      }
    }
  });
});

describe('개인정보 최소 분석 이벤트 정제 계약', () => {
  it('허용된 속성만 통과시키고 생년월일·금지 키는 제거한다', () => {
    const event = sanitizeAnalyticsEvent('saju_complete', {
      uiVersion: 'v1',
      mode: 'basic',
      precision: 'minute',
      birth: '1992-10-24',
      year: '1992',
    });

    expect(event.props).toEqual({
      uiVersion: 'v1',
      mode: 'basic',
      precision: 'minute',
    });
    expect('birth' in event.props).toBe(false);
    expect('year' in event.props).toBe(false);
  });

  it('허용된 속성 이름에 생년월일 패턴을 넣으려 해도 차단한다', () => {
    const event = sanitizeAnalyticsEvent('consultation_click', {
      page: '/saju/1992-10-24',
      placement: 'bottom-cta',
      channel: 'email',
    });
    expect(event.props.page).toBeUndefined();
    expect(event.props.placement).toBe('bottom-cta');
  });
});
