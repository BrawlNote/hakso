/**
 * 대한민국(Asia/Seoul) 역사적 표준시·일광절약시간(서머타임, DST) 처리 모듈
 *
 * 규칙 (docs/02_TECHNICAL_SPEC.md 2.2절):
 * - 모든 과거 출생에 UTC+9를 고정하지 않는다.
 * - 실행 기기(맥·서버·브라우저)의 로컬 타임존에 의존하지 않고 순수 정수/UTC 연산만 사용한다.
 * - 서머타임 시작 전환으로 당시 시계에 존재하지 않는 현지 시각(Spring-forward gap)은 거부한다.
 * - 서머타임 종료 전환으로 두 번 존재했던 현지 시각(Fall-back overlap)은 모호성 제한을 기록한다.
 */

export interface HistoricalTimeResolution {
  readonly status: 'ok' | 'nonexistent';
  readonly standardOffsetMin: number;
  readonly dstOffsetMin: number;
  readonly totalOffsetMin: number;
  readonly instantUTCms: number;
  readonly standardClockMs: number;
  readonly isDstApplied: boolean;
  readonly isAmbiguousOverlap: boolean;
  readonly isPre1908: boolean;
  readonly note: string | null;
  readonly errorReason?: string;
}

const MINUTE_MS = 60_000;

interface DstRule {
  readonly start: { readonly y: number; readonly mo: number; readonly d: number; readonly h: number; readonly m: number };
  readonly end: { readonly y: number; readonly mo: number; readonly d: number; readonly h: number; readonly m: number };
  /** 시작 시점에 건너뛴 시각 구간 (존재하지 않는 벽시계 시각) */
  readonly gapStartHour: number;
  readonly gapEndHour: number;
  /** 종료 시점에 겹친 시각 구간 (두 번 반복된 벽시계 시각) */
  readonly overlapStartHour: number;
  readonly overlapEndHour: number;
}

const KOREA_DST_RULES: readonly DstRule[] = [
  { start: { y: 1948, mo: 6, d: 1, h: 0, m: 0 }, end: { y: 1948, mo: 9, d: 13, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1949, mo: 4, d: 3, h: 0, m: 0 }, end: { y: 1949, mo: 9, d: 11, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1950, mo: 4, d: 1, h: 0, m: 0 }, end: { y: 1950, mo: 9, d: 10, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1951, mo: 5, d: 6, h: 0, m: 0 }, end: { y: 1951, mo: 9, d: 9, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1955, mo: 5, d: 5, h: 0, m: 0 }, end: { y: 1955, mo: 9, d: 9, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1956, mo: 5, d: 20, h: 0, m: 0 }, end: { y: 1956, mo: 9, d: 30, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1957, mo: 5, d: 5, h: 0, m: 0 }, end: { y: 1957, mo: 9, d: 22, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1958, mo: 5, d: 4, h: 0, m: 0 }, end: { y: 1958, mo: 9, d: 21, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1959, mo: 5, d: 3, h: 0, m: 0 }, end: { y: 1959, mo: 9, d: 20, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1960, mo: 5, d: 1, h: 0, m: 0 }, end: { y: 1960, mo: 9, d: 18, h: 0, m: 0 }, gapStartHour: 0, gapEndHour: 1, overlapStartHour: 23, overlapEndHour: 24 },
  { start: { y: 1987, mo: 5, d: 10, h: 2, m: 0 }, end: { y: 1987, mo: 10, d: 11, h: 3, m: 0 }, gapStartHour: 2, gapEndHour: 3, overlapStartHour: 2, overlapEndHour: 3 },
  { start: { y: 1988, mo: 5, d: 8, h: 2, m: 0 }, end: { y: 1988, mo: 10, d: 9, h: 3, m: 0 }, gapStartHour: 2, gapEndHour: 3, overlapStartHour: 2, overlapEndHour: 3 },
];

function toDateInt(y: number, mo: number, d: number): number {
  return y * 10000 + mo * 100 + d;
}

function toMinuteKey(y: number, mo: number, d: number, h: number, m: number): number {
  return Date.UTC(y, mo - 1, d, h, m, 0) / MINUTE_MS;
}

/**
 * 출생 양력 연·월·일의 대한민국 법정 표준시 오프셋(분)을 반환한다.
 * - 1908-04-01 ~ 1911-12-31: UTC+08:30 (510분)
 * - 1912-01-01 ~ 1954-03-20: UTC+09:00 (540분)
 * - 1954-03-21 ~ 1961-08-09: UTC+08:30 (510분)
 * - 1961-08-10 ~ 현재: UTC+09:00 (540분)
 */
export function getKoreaStandardOffsetMin(year: number, month: number, day: number): number {
  const dateInt = toDateInt(year, month, day);
  if (dateInt >= 19080401 && dateInt <= 19111231) {
    return 510;
  }
  if (dateInt >= 19540321 && dateInt <= 19610809) {
    return 510;
  }
  return 540;
}

/**
 * 대한민국 현지 벽시계 시각(양력 연·월·일·시·분)을 역사적 오프셋·서머타임 규칙에 따라 해석한다.
 */
export function resolveKoreaHistoricalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): HistoricalTimeResolution {
  const dateInt = toDateInt(year, month, day);
  const isPre1908 = dateInt < 19080401;
  const standardOffsetMin = getKoreaStandardOffsetMin(year, month, day);

  // 1912-01-01 00:00 및 1961-08-10 00:00 에 UTC+08:30 -> UTC+09:00 전환으로 00:00~00:29 벽시계 시각이 건너뛰어짐
  if (
    ((year === 1912 && month === 1 && day === 1) || (year === 1961 && month === 8 && day === 10)) &&
    hour === 0 &&
    minute < 30
  ) {
    return {
      status: 'nonexistent',
      standardOffsetMin,
      dstOffsetMin: 0,
      totalOffsetMin: standardOffsetMin,
      instantUTCms: 0,
      standardClockMs: 0,
      isDstApplied: false,
      isAmbiguousOverlap: false,
      isPre1908,
      note: null,
      errorReason: `${year}년 ${month}월 ${day}일 00시 00분~00시 29분은 대한민국 표준시 변경(UTC+8:30 → UTC+9:00)으로 인해 당시 시계에 존재하지 않았던 시각입니다.`,
    };
  }

  const wallKey = toMinuteKey(year, month, day, hour, minute);
  let isDstApplied = false;
  let isAmbiguousOverlap = false;

  // 1954-03-21 00:00 에 UTC+09:00 -> UTC+08:30 전환으로 1954-03-20 23:30~23:59 구간이 두 번 발생
  if (year === 1954 && month === 3 && day === 20 && hour === 23 && minute >= 30) {
    isAmbiguousOverlap = true;
  }

  for (const rule of KOREA_DST_RULES) {
    // 서머타임 시작일의 존재하지 않는 시각(Spring-forward gap) 검사
    if (
      year === rule.start.y &&
      month === rule.start.mo &&
      day === rule.start.d &&
      hour >= rule.gapStartHour &&
      hour < rule.gapEndHour
    ) {
      return {
        status: 'nonexistent',
        standardOffsetMin,
        dstOffsetMin: 0,
        totalOffsetMin: standardOffsetMin,
        instantUTCms: 0,
        standardClockMs: 0,
        isDstApplied: false,
        isAmbiguousOverlap: false,
        isPre1908,
        note: null,
        errorReason: `${year}년 ${month}월 ${day}일 ${String(rule.gapStartHour).padStart(2, '0')}:00~${String(rule.gapStartHour).padStart(2, '0')}:59 구간은 대한민국 일광절약시간제(서머타임) 시작으로 시계가 1시간 앞당겨져 존재하지 않았던 시각입니다.`,
      };
    }

    const startKey = toMinuteKey(rule.start.y, rule.start.mo, rule.start.d, rule.start.h, rule.start.m);
    const endKey = toMinuteKey(rule.end.y, rule.end.mo, rule.end.d, rule.end.h, rule.end.m);

    // 서머타임 종료 직전 1시간(endKey - 60분 ~ endKey)은 시계가 1시간 뒤로 돌아가며 두 번 반복된 중복 시각(Fall-back overlap) 구간임
    // - 1948~1960년: 종료 시각(익일 00:00 = 전일 24:00) 직전 1시간인 종료 전날 23:00~23:59
    // - 1987~1988년: 종료 시각(당일 03:00) 직전 1시간인 종료 당일 02:00~02:59
    if (wallKey >= endKey - 60 && wallKey < endKey) {
      isAmbiguousOverlap = true;
    }

    if (wallKey >= startKey && wallKey < endKey) {
      isDstApplied = true;
      break;
    }
  }

  const dstOffsetMin = isDstApplied ? 60 : 0;
  const totalOffsetMin = standardOffsetMin + dstOffsetMin;
  const wallMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const instantUTCms = wallMs - totalOffsetMin * MINUTE_MS;
  // 서머타임(+60분)이 적용된 시기에는 일주·시주 판정 시 서머타임 1시간을 원래 표준시로 되돌린 시각(standardClockMs)을 사용한다.
  const standardClockMs = instantUTCms + standardOffsetMin * MINUTE_MS;

  const notes: string[] = [];
  if (isPre1908) {
    notes.push('1908년 4월 1일 대한제국 표준시 제정 이전 출생일로, 동경 135도(UTC+9) 기준을 기본 적용했습니다.');
  }
  if (standardOffsetMin === 510) {
    notes.push('출생 당시 대한민국 법정 표준시(동경 127.5도, UTC+8:30)를 반영하여 절입 및 시각을 계산했습니다.');
  }
  if (isDstApplied) {
    notes.push('출생 당시 시행된 대한민국 서머타임(일광절약시간제, +1시간)을 반영해 표준시 기준으로 1시간 역산했습니다.');
  }
  if (isAmbiguousOverlap) {
    notes.push('서머타임 또는 표준시 해제 시점의 중복 시각 구간에 해당하여 변경 전·후 기준 차이가 발생할 수 있습니다.');
  }

  return {
    status: 'ok',
    standardOffsetMin,
    dstOffsetMin,
    totalOffsetMin,
    instantUTCms,
    standardClockMs,
    isDstApplied,
    isAmbiguousOverlap,
    isPre1908,
    note: notes.length > 0 ? notes.join(' ') : null,
  };
}
