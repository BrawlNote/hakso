/**
 * 콘텐츠 공개 승인 필터 및 검증 유틸리티
 *
 * 규칙:
 * - `draft === false` 이고 `reviewStatus === 'approved'` 인 콘텐츠만 공개 목록·상세·사이트맵·관련 글에 노출한다.
 * - `reviewStatus === 'approved'` 인 경우 반드시 실제 검수자(`reviewer`)가 비어 있지 않아야 한다.
 */

export interface PublishableMeta {
  readonly title: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly updatedAt?: string;
  readonly draft: boolean;
  readonly reviewStatus: 'draft' | 'pending' | 'approved';
  readonly author: string;
  readonly reviewer?: string;
}

export interface ContentEntryLike<T extends PublishableMeta = PublishableMeta> {
  readonly id: string;
  readonly data: T;
}

/**
 * 단일 콘텐츠가 공개 가능한 승인 상태인지 판정한다.
 */
export function isPubliclyApproved<T extends PublishableMeta>(meta: T): boolean {
  if (meta.draft !== false) {
    return false;
  }
  if (meta.reviewStatus !== 'approved') {
    return false;
  }
  if (!meta.reviewer || meta.reviewer.trim().length === 0) {
    return false;
  }
  return true;
}

/**
 * 컬렉션 배열에서 공개 승인된 항목만 필터링하고 최신 발행일 순으로 정렬한다.
 */
export function filterApprovedEntries<T extends PublishableMeta, E extends ContentEntryLike<T>>(
  entries: readonly E[],
): E[] {
  return entries
    .filter((entry) => isPubliclyApproved(entry.data))
    .sort((a, b) => b.data.publishedAt.localeCompare(a.data.publishedAt));
}
