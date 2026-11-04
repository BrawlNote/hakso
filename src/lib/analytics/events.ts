/**
 * 개인정보 최소화 이벤트 계측 모듈 (docs/01_REQUIREMENTS.md 9절)
 *
 * 규칙:
 * - 생년월일·명식·상담 내용·입력값·전체 쿼리·개인 결과·원문 오류는 절대 수집하거나 전송하지 않는다.
 * - 사전 정의된 이벤트 이름과 허용된 열거형/식별자 속성만 통과시킨다.
 */

export type AllowedEventName =
  | 'consultation_click'
  | 'email_compose_open'
  | 'email_address_copy'
  | 'saju_start'
  | 'saju_complete'
  | 'saju_error'
  | 'article_consultation_click';

export interface SafeAnalyticsPayload {
  readonly event: AllowedEventName;
  readonly props: Readonly<Record<string, string>>;
}

const FORBIDDEN_KEYS = new Set([
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'birth',
  'date',
  'pillars',
  'chart',
  'readings',
  'name',
  'phone',
  'email',
  'query',
  'url',
]);

const ALLOWED_PROP_KEYS: Readonly<Record<AllowedEventName, readonly string[]>> = Object.freeze({
  consultation_click: ['page', 'placement', 'channel'],
  email_compose_open: ['placement'],
  email_address_copy: ['placement'],
  saju_start: ['uiVersion', 'mode'],
  saju_complete: ['uiVersion', 'mode', 'precision'],
  saju_error: ['errorCode'],
  article_consultation_click: ['slug', 'placement'],
});

/**
 * 입력 속성에서 허용된 키만 남기고 금지된 개인정보 키가 있으면 즉시 제거한다.
 */
export function sanitizeAnalyticsEvent(
  event: AllowedEventName,
  rawProps: Record<string, string | undefined>,
): SafeAnalyticsPayload {
  const allowedKeys = ALLOWED_PROP_KEYS[event] ?? [];
  const safeProps: Record<string, string> = {};

  for (const key of allowedKeys) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    const val = rawProps[key];
    if (typeof val === 'string' && val.length > 0 && val.length <= 64) {
      // 숫자 생년월일 패턴(YYYY-MM-DD 등)이 값에 섞여 있으면 차단
      if (/\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(val)) {
        continue;
      }
      safeProps[key] = val;
    }
  }

  return {
    event,
    props: Object.freeze(safeProps),
  };
}
