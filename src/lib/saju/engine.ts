/**
 * 학소 철학관 만세력·사주 계산 코어 및 정책 엔진
 *
 * 설계 원칙:
 * 1. 기기/서버의 로컬 타임존(new Date('YYYY-MM-DD') 등)에 의존하지 않고 순수 정수·UTC 연산만 수행한다.
 * 2. 출생 시간 모름(unknown)일 때 임의 정오(12:00) 시주를 생성하지 않고 hour: null을 반환한다.
 * 3. 대한민국 과거 표준시(UTC+8:30)와 서머타임(DST)을 검증·반영하며, 존재하지 않는 전환 시각은 거부한다.
 * 4. 절입 당일 시간 미상, 절입 전후 근접 시각, 23:00~23:59 자시 경계, 태양시 시진 경계를 명시적으로 감지해 안내한다.
 */

import {
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_HANJA,
  FIVE_ELEMENTS,
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_HANJA,
  getEarthlyBranchElement,
  getEarthlyBranchYinYang,
  getHeavenlyStemElement,
  getHeavenlyStemYinYang,
  getSolarTerm,
  isValidSolarDate,
  lunarToSolar,
  solarToLunar,
  type EarthlyBranch,
  type FiveElement,
  type HeavenlyStem,
} from 'manseryeok';
import { buildValidatedFactsAndReadings } from './interpretations';
import { getKoreaStandardOffsetMin, resolveKoreaHistoricalTime } from './korea-time';
import type {
  BoundaryAlternative,
  ConsultationTopicKey,
  FiveElementSummary,
  LimitationItem,
  PillarDetail,
  SajuBirthInput,
  SajuCalculationResult,
  SajuChart,
} from './types';

export const SUPPORTED_MIN_SOLAR_YEAR = 1900;
export const DEFAULT_REFERENCE_TODAY = Object.freeze({ year: 2026, month: 11, day: 4 });

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/**
 * 실행 기기의 로컬 타임존 설정과 무관하게 현재 대한민국(Asia/Seoul, UTC+9) 기준 양력 오늘(연·월·일)을 반환한다.
 */
export function getCurrentSeoulSolarDate(nowMs: number = Date.now()): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const seoulClockMs = nowMs + 540 * MS_PER_MINUTE;
  const d = new Date(seoulClockMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** 일주 기준 앵커: 양력 1900-01-01 = 갑술(甲戌, 60갑자 index 10) */
const DAY_ANCHOR_UTC_MS = Date.UTC(1900, 0, 1);
const DAY_ANCHOR_GANJI_INDEX = 10;

/** 12절(節) 인덱스(manseryeok 기준: 2=입춘 ... 0=소한)와 절기 월 번호(1=인월 ... 12=축월) */
const JEOL_INDEX_TO_SAJU_MONTH: ReadonlyArray<readonly [number, number]> = [
  [2, 1], // 입춘 -> 인월
  [4, 2], // 경칩 -> 묘월
  [6, 3], // 청명 -> 진월
  [8, 4], // 입하 -> 사월
  [10, 5], // 망종 -> 오월
  [12, 6], // 소서 -> 미월
  [14, 7], // 입추 -> 신월
  [16, 8], // 백로 -> 유월
  [18, 9], // 한로 -> 술월
  [20, 10], // 입동 -> 해월
  [22, 11], // 대설 -> 자월
  [0, 12], // 소한 -> 축월
];

/** 절기 월 번호(1=인월 ... 12=축월) -> 지지 */
const SAJU_MONTH_TO_BRANCH: Readonly<Record<number, EarthlyBranch>> = {
  1: '인',
  2: '묘',
  3: '진',
  4: '사',
  5: '오',
  6: '미',
  7: '신',
  8: '유',
  9: '술',
  10: '해',
  11: '자',
  12: '축',
};

const STEM_READING_LABELS: Readonly<Record<HeavenlyStem, string>> = {
  갑: '갑목(甲木)',
  을: '을목(乙木)',
  병: '병화(丙火)',
  정: '정화(丁火)',
  무: '무토(戊土)',
  기: '기토(己土)',
  경: '경금(庚金)',
  신: '신금(辛金)',
  임: '임수(壬水)',
  계: '계수(癸水)',
};

const BRANCH_READING_LABELS: Readonly<Record<EarthlyBranch, string>> = {
  자: '자수(子水)',
  축: '축토(丑土)',
  인: '인목(寅木)',
  묘: '묘목(卯木)',
  진: '진토(辰土)',
  사: '사화(巳火)',
  오: '오화(午火)',
  미: '미토(未土)',
  신: '신금(申金)',
  유: '유금(酉金)',
  술: '술토(戌土)',
  해: '해수(亥水)',
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function buildPillarDetail(stem: HeavenlyStem, branch: EarthlyBranch): PillarDetail {
  const stemIdx = HEAVENLY_STEMS.indexOf(stem);
  const branchIdx = EARTHLY_BRANCHES.indexOf(branch);
  const stemHanja = HEAVENLY_STEMS_HANJA[stemIdx];
  const branchHanja = EARTHLY_BRANCHES_HANJA[branchIdx];

  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    stemHanja,
    branchHanja,
    korean: `${stem}${branch}`,
    hanja: `${stemHanja}${branchHanja}`,
    stemElement: getHeavenlyStemElement(stem),
    branchElement: getEarthlyBranchElement(branch),
    stemYinYang: getHeavenlyStemYinYang(stem),
    branchYinYang: getEarthlyBranchYinYang(branch),
    stemReading: STEM_READING_LABELS[stem],
    branchReading: BRANCH_READING_LABELS[branch],
  };
}

function getYearPillarBySajuYear(sajuYear: number): PillarDetail {
  const stem = HEAVENLY_STEMS[mod(sajuYear - 4, 10)];
  const branch = EARTHLY_BRANCHES[mod(sajuYear - 4, 12)];
  return buildPillarDetail(stem, branch);
}

function getMonthPillarBySajuYearAndMonth(sajuYear: number, sajuMonth: number): PillarDetail {
  const yearStemIdx = mod(sajuYear - 4, 10);
  const monthStemIdx = mod((yearStemIdx % 5) * 2 + sajuMonth + 1, 10);
  const stem = HEAVENLY_STEMS[monthStemIdx];
  const branch = SAJU_MONTH_TO_BRANCH[sajuMonth];
  return buildPillarDetail(stem, branch);
}

function getDayGanjiIndex(solarYear: number, solarMonth: number, solarDay: number): number {
  const targetMs = Date.UTC(solarYear, solarMonth - 1, solarDay);
  const diffDays = Math.round((targetMs - DAY_ANCHOR_UTC_MS) / MS_PER_DAY);
  return mod(DAY_ANCHOR_GANJI_INDEX + diffDays, 60);
}

function getDayPillarByGanjiIndex(ganjiIndex: number): PillarDetail {
  const stem = HEAVENLY_STEMS[mod(ganjiIndex, 10)];
  const branch = EARTHLY_BRANCHES[mod(ganjiIndex, 12)];
  return buildPillarDetail(stem, branch);
}

function getShichenIndex(hour: number, minute: number): number {
  const totalMinutes = hour * 60 + minute;
  return Math.floor(((totalMinutes + 60) % 1440) / 120);
}

function getHourPillarByDayStemAndShichen(dayStemIndex: number, shichenIndex: number): PillarDetail {
  const hourStemBase = (dayStemIndex % 5) * 2;
  const stem = HEAVENLY_STEMS[mod(hourStemBase + shichenIndex, 10)];
  const branch = EARTHLY_BRANCHES[mod(shichenIndex, 12)];
  return buildPillarDetail(stem, branch);
}

interface SolarTermBoundaryCheck {
  readonly sajuYear: number;
  readonly sajuMonth: number;
  readonly nearestTerm: {
    readonly name: string;
    readonly hanja: string;
    readonly termInstantMs: number;
    readonly diffMinutes: number;
  } | null;
}

function evaluateYearAndMonthAtInstant(instantUTCms: number, solarYear: number): SolarTermBoundaryCheck {
  const lichunTerm = getSolarTerm(solarYear, 2);
  const lichunMs = lichunTerm.date.getTime();
  const sajuYear = instantUTCms < lichunMs ? solarYear - 1 : solarYear;

  let bestBoundaryMs = -Infinity;
  let sajuMonth = 12;
  let nearestTerm: SolarTermBoundaryCheck['nearestTerm'] = null;
  let minAbsDiffMin = Infinity;

  for (const yr of [solarYear - 1, solarYear, solarYear + 1]) {
    for (const [termIndex, mon] of JEOL_INDEX_TO_SAJU_MONTH) {
      const term = getSolarTerm(yr, termIndex);
      const boundaryMs = term.date.getTime();
      if (boundaryMs <= instantUTCms && boundaryMs > bestBoundaryMs) {
        bestBoundaryMs = boundaryMs;
        sajuMonth = mon;
      }
      const diffMinutes = Math.round((instantUTCms - boundaryMs) / MS_PER_MINUTE);
      const absDiff = Math.abs(diffMinutes);
      if (absDiff < minAbsDiffMin) {
        minAbsDiffMin = absDiff;
        nearestTerm = {
          name: term.name,
          hanja: term.hanja,
          termInstantMs: boundaryMs,
          diffMinutes,
        };
      }
    }
  }

  return { sajuYear, sajuMonth, nearestTerm };
}

function formatOffsetTime(instantUTCms: number, offsetMin: number): string {
  const localMs = instantUTCms + offsetMin * MS_PER_MINUTE;
  const d = new Date(localMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function computeSurfaceFiveElements(pillars: {
  readonly year: PillarDetail;
  readonly month: PillarDetail;
  readonly day: PillarDetail;
  readonly hour: PillarDetail | null;
}): FiveElementSummary {
  const counts: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const list: PillarDetail[] = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) {
    list.push(pillars.hour);
  }

  for (const p of list) {
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
  }

  const totalCharacters = pillars.hour ? 8 : 6;
  const threshold = pillars.hour ? 3 : 2;
  const dominantElements = FIVE_ELEMENTS.filter((el) => counts[el] >= threshold);
  const lackingElements = FIVE_ELEMENTS.filter((el) => counts[el] === 0);

  return {
    scope: pillars.hour ? 'four-pillars-8chars' : 'three-pillars-6chars',
    totalCharacters,
    counts,
    dominantElements,
    lackingElements,
    note:
      pillars.hour === null
        ? '출생 시각 미상으로 시주(2글자)를 제외한 연·월·일 삼주(6글자)의 천간·지지 표면 오행 개수만 집계했습니다.'
        : '연·월·일·시 사주(8글자)의 천간·지지 표면 오행 개수만 정수 단위로 집계했으며, 지장간 가중치나 임의 퍼센트 점수는 사용하지 않습니다.',
  };
}

function isFutureSolarDate(
  year: number,
  month: number,
  day: number,
  today: { readonly year: number; readonly month: number; readonly day: number },
): boolean {
  if (year !== today.year) return year > today.year;
  if (month !== today.month) return month > today.month;
  return day > today.day;
}

/**
 * 생년월일시 입력을 검증하고 사주 명식과 고정 기본 풀이를 계산한다.
 */
export function calculateSaju(
  rawInput: SajuBirthInput,
  options?: { readonly referenceToday?: { readonly year: number; readonly month: number; readonly day: number } },
): SajuCalculationResult {
  if (!rawInput || typeof rawInput !== 'object') {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      field: 'general',
      message: '출생 정보를 올바르게 입력해 주세요.',
      recoveryHint: '양력/음력 구분과 생년월일을 다시 확인해 주세요.',
    };
  }

  const calendar = rawInput.calendar;
  if (calendar !== 'solar' && calendar !== 'lunar') {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      field: 'calendar',
      message: '양력 또는 음력 구분을 선택해 주세요.',
      recoveryHint: '양력과 음력 중 하나를 선택한 뒤 다시 시도해 주세요.',
    };
  }

  const birthRegion = rawInput.birthRegion ?? 'KR';
  if (birthRegion !== 'KR') {
    return {
      ok: false,
      code: 'UNSUPPORTED_BIRTH_REGION',
      field: 'birthRegion',
      message: '현재 무료 사주 체험은 대한민국(Asia/Seoul) 출생 기준으로만 검증·제공됩니다.',
      recoveryHint:
        '해외 출생자는 현지 시간대·경도·서머타임 이력을 임의로 한국 표준시(KST)로 치환하지 않으므로, 개별 이메일 상담을 통해 문의해 주세요.',
    };
  }

  const { year, month, day } = rawInput;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      field: 'date',
      message: '출생 연·월·일은 정수로 입력해 주세요.',
      recoveryHint: '연도(4자리), 월(1~12), 일(1~31)을 숫자로 입력해 주세요.',
    };
  }

  const today = options?.referenceToday ?? getCurrentSeoulSolarDate();

  const minInputYear = calendar === 'lunar' ? SUPPORTED_MIN_SOLAR_YEAR - 1 : SUPPORTED_MIN_SOLAR_YEAR;
  if (year < minInputYear) {
    return {
      ok: false,
      code: 'OUT_OF_SUPPORTED_RANGE',
      field: 'date',
      message: `지원하는 출생 연도 범위(양력 ${SUPPORTED_MIN_SOLAR_YEAR}년 이후) 이전의 날짜입니다.`,
      recoveryHint: `양력 ${SUPPORTED_MIN_SOLAR_YEAR}년부터 ${today.year}년 사이의 생년월일을 입력해 주세요.`,
    };
  }

  if (year > today.year + 1) {
    return {
      ok: false,
      code: 'FUTURE_BIRTH_DATE',
      field: 'date',
      message: '미래의 출생일은 계산할 수 없습니다.',
      recoveryHint: '실제 출생한 과거 또는 오늘 날짜를 입력해 주세요.',
    };
  }

  // 양력 전환 시 윤달 상태는 항상 false로 정규화
  const isLeapMonth = calendar === 'lunar' ? Boolean(rawInput.isLeapMonth) : false;

  let solarDate: { year: number; month: number; day: number };
  let lunarDate: { year: number; month: number; day: number; isLeapMonth: boolean };

  if (calendar === 'solar') {
    if (!isValidSolarDate(year, month, day)) {
      return {
        ok: false,
        code: 'INVALID_SOLAR_DATE',
        field: 'date',
        message: `${year}년 ${month}월 ${day}일은 달력에 존재하지 않는 양력 날짜입니다.`,
        recoveryHint: '윤년(2월 29일) 여부나 각 달의 마지막 날(30일/31일)을 다시 확인해 주세요.',
      };
    }
    if (isFutureSolarDate(year, month, day, today)) {
      return {
        ok: false,
        code: 'FUTURE_BIRTH_DATE',
        field: 'date',
        message: '미래의 출생일은 사주 명식을 계산할 수 없습니다.',
        recoveryHint: '오늘 이전의 실제 출생 연·월·일을 입력해 주세요.',
      };
    }
    solarDate = { year, month, day };
    lunarDate = solarToLunar(year, month, day);
  } else {
    if (month < 1 || month > 12 || day < 1 || day > 30) {
      return {
        ok: false,
        code: 'INVALID_LUNAR_DATE',
        field: 'date',
        message: `음력 ${year}년 ${month}월 ${day}일은 유효한 음력 날짜 범위가 아닙니다.`,
        recoveryHint: '음력 월은 1~12월, 일은 1~29일(큰달은 30일) 범위에서 입력해 주세요.',
      };
    }
    try {
      const converted = lunarToSolar(year, month, day, isLeapMonth);
      solarDate = converted;
      lunarDate = { year, month, day, isLeapMonth };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (isLeapMonth && msg.includes('존재하지 않습니다')) {
        return {
          ok: false,
          code: 'NONEXISTENT_LEAP_MONTH',
          field: 'isLeapMonth',
          message: `음력 ${year}년에는 윤${month}월이 존재하지 않습니다.`,
          recoveryHint: '윤달이 아닌 평달 생일인지 확인하시고 "윤달" 선택을 해제한 뒤 다시 시도해 주세요.',
        };
      }
      return {
        ok: false,
        code: 'INVALID_LUNAR_DATE',
        field: 'date',
        message: `음력 ${year}년 ${isLeapMonth ? '윤' : ''}${month}월 ${day}일은 해당 월에 존재하지 않는 날짜입니다(작은달 29일 기준 확인).`,
        recoveryHint: '해당 음력 월이 29일까지 있는 작은달인지, 또는 양력 생일을 음력으로 잘못 선택하셨는지 확인해 주세요.',
      };
    }

    if (solarDate.year < SUPPORTED_MIN_SOLAR_YEAR) {
      return {
        ok: false,
        code: 'OUT_OF_SUPPORTED_RANGE',
        field: 'date',
        message: `양력 변환 결과(${solarDate.year}년)가 지원 범위(${SUPPORTED_MIN_SOLAR_YEAR}년 이후) 이전입니다.`,
        recoveryHint: `${SUPPORTED_MIN_SOLAR_YEAR}년 이후 출생일을 입력해 주세요.`,
      };
    }

    if (isFutureSolarDate(solarDate.year, solarDate.month, solarDate.day, today)) {
      return {
        ok: false,
        code: 'FUTURE_BIRTH_DATE',
        field: 'date',
        message: `음력 입력을 변환한 양력 날짜(${solarDate.year}-${String(solarDate.month).padStart(2, '0')}-${String(solarDate.day).padStart(2, '0')})가 미래 날짜입니다.`,
        recoveryHint: '출생 연도와 음력/양력 구분을 다시 확인해 주세요.',
      };
    }
  }

  const timeStatus = rawInput.timeStatus;
  if (timeStatus !== 'known' && timeStatus !== 'unknown') {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      field: 'time',
      message: '출생 시각 인지 여부(시각 입력 또는 시간 모름)를 선택해 주세요.',
      recoveryHint: '출생 시각을 아시면 시·분을 입력하시고, 모르시면 "출생 시간 모름"을 선택해 주세요.',
    };
  }

  const topic: ConsultationTopicKey =
    rawInput.topic && ['general', 'career', 'relationship', 'decision'].includes(rawInput.topic)
      ? rawInput.topic
      : 'general';

  const limitations: LimitationItem[] = [
    {
      code: 'DRAFT_POLICY_NOTICE',
      title: '학소 계산 기준 기본안(hakso-draft-v1) 안내',
      description:
        '현재 표시되는 계산 기준(입춘·절입 시각 기준, 00:00 일주 경계, 법정 표준시 및 과거 서머타임 역산 적용)과 기본 풀이 문구는 학소 운영자 최종 검수 전 기본안입니다.',
    },
  ];
  const boundaryAlternatives: BoundaryAlternative[] = [];

  let yearPillar: PillarDetail;
  let monthPillar: PillarDetail;
  let dayPillar: PillarDetail;
  let hourPillar: PillarDetail | null = null;
  let civilOffsetMinutes: number | null = null;
  let historicalTimeNote: string | null = null;
  let timeLabel = '출생 시간 모름 (시주 미생성)';

  if (timeStatus === 'unknown') {
    limitations.push({
      code: 'UNKNOWN_BIRTH_TIME',
      title: '출생 시간 미상 — 시주(時柱) 제외 안내',
      description:
        '출생 시각을 알지 못하므로 임의의 정오(12:00)를 대입하지 않고 시주를 비워 두었습니다. 연·월·일 삼주(6글자)를 기준으로만 기본 풀이를 제공합니다.',
    });

    const stdOffsetMin = getKoreaStandardOffsetMin(solarDate.year, solarDate.month, solarDate.day);
    const startOfDayUTC = Date.UTC(solarDate.year, solarDate.month - 1, solarDate.day, 0, 0, 0) - stdOffsetMin * MS_PER_MINUTE;
    const endOfDayUTC = Date.UTC(solarDate.year, solarDate.month - 1, solarDate.day, 23, 59, 0) - stdOffsetMin * MS_PER_MINUTE;

    const startEval = evaluateYearAndMonthAtInstant(startOfDayUTC, solarDate.year);
    const endEval = evaluateYearAndMonthAtInstant(endOfDayUTC, solarDate.year);

    // 기본 표시는 해당 날짜 후반(절입 이후 또는 당일 유지) 기준으로 두되, 당일 절입이 있으면 명확히 두 후보를 모두 안내한다.
    yearPillar = getYearPillarBySajuYear(endEval.sajuYear);
    monthPillar = getMonthPillarBySajuYearAndMonth(endEval.sajuYear, endEval.sajuMonth);
    dayPillar = getDayPillarByGanjiIndex(getDayGanjiIndex(solarDate.year, solarDate.month, solarDate.day));
    hourPillar = null;

    if (startEval.sajuYear !== endEval.sajuYear || startEval.sajuMonth !== endEval.sajuMonth) {
      const beforeYearPillar = getYearPillarBySajuYear(startEval.sajuYear);
      const beforeMonthPillar = getMonthPillarBySajuYearAndMonth(startEval.sajuYear, startEval.sajuMonth);
      const termInfo = endEval.nearestTerm;
      const termTimeStr = termInfo ? formatOffsetTime(termInfo.termInstantMs, stdOffsetMin) : '당일 절입 시각';
      const termLabel = termInfo ? `${termInfo.name}(${termInfo.hanja})` : '절기';

      limitations.push({
        code: 'SOLAR_TERM_DAY_UNKNOWN_TIME',
        title: `절기(${termLabel}) 당일 출생 + 시간 미상 경계 주의`,
        description: `출생일(${solarDate.year}-${String(solarDate.month).padStart(2, '0')}-${String(solarDate.day).padStart(2, '0')}) ${termTimeStr}경에 ${termLabel} 절입이 있어, 출생 시각이 절입 이전인지 이후인지에 따라 연주·월주가 달라집니다.`,
      });

      boundaryAlternatives.push({
        reasonCode: 'SOLAR_TERM_DAY_UNKNOWN_TIME',
        title: `${termLabel}(${termTimeStr}) 이전 출생일 경우의 후보 명식`,
        description: `출생 시간을 모르시나 만약 ${termTimeStr} 이전에 태어나셨다면 아래 기둥이 적용됩니다.`,
        candidatePillarsNote: `절입 이전: 연주 ${beforeYearPillar.korean}(${beforeYearPillar.hanja}) · 월주 ${beforeMonthPillar.korean}(${beforeMonthPillar.hanja}) / 절입 이후: 연주 ${yearPillar.korean}(${yearPillar.hanja}) · 월주 ${monthPillar.korean}(${monthPillar.hanja})`,
      });
    }
  } else {
    const hour = rawInput.hour;
    const minute = rawInput.minute;
    if (
      typeof hour !== 'number' ||
      typeof minute !== 'number' ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        field: 'time',
        message: '출생 시각은 00~23시, 00~59분 범위의 정수로 입력해 주세요.',
        recoveryHint: '정확한 시각을 모르시는 경우 "출생 시간 모름"을 선택해 주세요.',
      };
    }

    const timeRes = resolveKoreaHistoricalTime(solarDate.year, solarDate.month, solarDate.day, hour, minute);
    if (timeRes.status === 'nonexistent') {
      return {
        ok: false,
        code: 'NONEXISTENT_LOCAL_TIME',
        field: 'time',
        message: timeRes.errorReason ?? '당시 대한민국 법정 시계에 존재하지 않았던 전환 시각입니다.',
        recoveryHint: '출생 증명서나 가족 기록의 시각을 다시 확인하시거나, 시간 모름으로 기본 명식을 먼저 확인해 주세요.',
      };
    }

    civilOffsetMinutes = timeRes.totalOffsetMin;
    historicalTimeNote = timeRes.note;
    timeLabel = `${String(hour).padStart(2, '0')}시 ${String(minute).padStart(2, '0')}분`;

    if (timeRes.isPre1908) {
      limitations.push({
        code: 'PRE_1908_STANDARD_TIME',
        title: '1908년 대한제국 표준시 제정 이전 출생 안내',
        description: '1908년 4월 1일 이전 출생으로, 현대 한국 표준시(UTC+9) 기준을 기본 적용하여 산출했습니다.',
      });
    }
    if (timeRes.standardOffsetMin === 510) {
      limitations.push({
        code: 'HISTORICAL_STANDARD_TIME_OFFSET',
        title: '출생 당시 표준시(UTC+8:30) 반영 안내',
        description:
          '출생 당시 대한민국 법정 표준시가 동경 127.5도(UTC+8:30)였으므로, UTC+9를 일괄 고정하지 않고 당시 표준시 오프셋을 반영해 절입 시각을 비교했습니다.',
      });
    }
    if (timeRes.isDstApplied) {
      limitations.push({
        code: 'HISTORICAL_DST_APPLIED',
        title: '대한민국 과거 서머타임(일광절약시간제) 역산 적용',
        description:
          '출생 시점에 대한민국 서머타임(+1시간)이 시행 중이었으므로, 시계 시각에서 1시간을 역산한 표준시 기준으로 일주·시주와 절입 시각을 판정했습니다.',
      });
    }
    if (timeRes.isAmbiguousOverlap) {
      limitations.push({
        code: 'AMBIGUOUS_DST_TIME',
        title: '서머타임·표준시 해제 중복 시각 구간 안내',
        description:
          '시계가 뒤로 조정되면서 동일한 벽시계 시각이 두 번 반복된 구간입니다. 서머타임 해제 전·후 여부에 따라 시주 경계가 달라질 수 있습니다.',
      });
    }

    const ymEval = evaluateYearAndMonthAtInstant(timeRes.instantUTCms, solarDate.year);
    yearPillar = getYearPillarBySajuYear(ymEval.sajuYear);
    monthPillar = getMonthPillarBySajuYearAndMonth(ymEval.sajuYear, ymEval.sajuMonth);

    // 절입 시각 전후 ±15분 이내인 경우 분·초 정밀도 경계 안내
    if (ymEval.nearestTerm && Math.abs(ymEval.nearestTerm.diffMinutes) <= 15) {
      const term = ymEval.nearestTerm;
      const beforeEval = evaluateYearAndMonthAtInstant(term.termInstantMs - 60_000, solarDate.year);
      const afterEval = evaluateYearAndMonthAtInstant(term.termInstantMs + 60_000, solarDate.year);
      const beforeY = getYearPillarBySajuYear(beforeEval.sajuYear);
      const beforeM = getMonthPillarBySajuYearAndMonth(beforeEval.sajuYear, beforeEval.sajuMonth);
      const afterY = getYearPillarBySajuYear(afterEval.sajuYear);
      const afterM = getMonthPillarBySajuYearAndMonth(afterEval.sajuYear, afterEval.sajuMonth);
      const localTermStr = formatOffsetTime(term.termInstantMs, timeRes.totalOffsetMin);

      limitations.push({
        code: 'SOLAR_TERM_BOUNDARY_NEAR',
        title: `절입(${term.name} ${term.hanja}) 시각 근접 출생 주의`,
        description: `출생 시각이 ${term.name} 절입 시각(${localTermStr}경)과 약 ${Math.abs(term.diffMinutes)}분 차이로 매우 가깝습니다. 출생 기록의 분 단위 오차에 따라 연주 또는 월주가 달라질 수 있습니다.`,
      });

      boundaryAlternatives.push({
        reasonCode: 'SOLAR_TERM_BOUNDARY_NEAR',
        title: `${term.name}(${localTermStr}) 전후 후보 간지 비교`,
        description: '출생 시각 기록에 수 분의 오차가 있을 경우 아래 두 명식을 함께 참고해야 합니다.',
        candidatePillarsNote: `절입 전: 연주 ${beforeY.korean}(${beforeY.hanja}) · 월주 ${beforeM.korean}(${beforeM.hanja}) / 절입 후: 연주 ${afterY.korean}(${afterY.hanja}) · 월주 ${afterM.korean}(${afterM.hanja})`,
      });
    }

    // 표준시(서머타임 역산 후) 시각으로 일주 및 시주 산출
    const stdDate = new Date(timeRes.standardClockMs);
    const stdY = stdDate.getUTCFullYear();
    const stdMo = stdDate.getUTCMonth() + 1;
    const stdD = stdDate.getUTCDate();
    const stdH = stdDate.getUTCHours();
    const stdMin = stdDate.getUTCMinutes();

    const baseDayGanji = getDayGanjiIndex(stdY, stdMo, stdD);
    dayPillar = getDayPillarByGanjiIndex(baseDayGanji);

    const shichen = getShichenIndex(stdH, stdMin);
    const dayStemIdx = mod(baseDayGanji, 10);
    hourPillar = getHourPillarByDayStemAndShichen(dayStemIdx, shichen);

    // 23:00 ~ 23:59 (자시 경계: 00:00 자정 기준 vs 야자시/조자시 학파 차이 안내)
    if (stdH === 23) {
      const nextDayGanji = mod(baseDayGanji + 1, 60);
      const nextDayPillar = getDayPillarByGanjiIndex(nextDayGanji);
      const nextHourPillar = getHourPillarByDayStemAndShichen(mod(nextDayGanji, 10), 0);

      limitations.push({
        code: 'LATE_ZI_BOUNDARY_SENSITIVE',
        title: '23:00~23:59 자시(子時) 일주·시주 경계 안내',
        description:
          '23시대 출생은 자정(00:00)에 날짜가 바뀐다고 보는 기준, 23:00부터 다음날 일주로 보는 기준(조자시), 일주는 당일로 두되 시주 천간만 다음날 일간을 쓰는 기준(야자시)에 따라 결과가 달라집니다.',
      });

      boundaryAlternatives.push({
        reasonCode: 'LATE_ZI_BOUNDARY_SENSITIVE',
        title: '자시(23:00~23:59) 학파별 대안 간지',
        description: '학소 상담 시 내담자의 실제 삶과 대조하여 아래 경계 후보를 함께 살핍니다.',
        candidatePillarsNote: `자정(00:00) 기준: 일주 ${dayPillar.korean} · 시주 ${hourPillar.korean} / 야자시 분리 기준: 일주 ${dayPillar.korean} · 시주 ${nextHourPillar.korean} / 23시 일주 전환 기준: 일주 ${nextDayPillar.korean} · 시주 ${nextHourPillar.korean}`,
      });
    }

    // 동경 135도(UTC+9) 시기에서 서울/한반도 경도 보정(-30분) 적용 시 시진이 달라지는 경계(홀수 시 00분~29분) 안내
    if (timeRes.standardOffsetMin === 540 && stdH % 2 === 1 && stdMin < 32) {
      const solarAdjustedMs = timeRes.standardClockMs - 32 * MS_PER_MINUTE;
      const adjDate = new Date(solarAdjustedMs);
      const adjShichen = getShichenIndex(adjDate.getUTCHours(), adjDate.getUTCMinutes());
      const adjHourPillar = getHourPillarByDayStemAndShichen(dayStemIdx, adjShichen);

      if (adjHourPillar.korean !== hourPillar.korean) {
        limitations.push({
          code: 'SOLAR_TIME_SHICHEN_SENSITIVE',
          title: '법정 표준시와 지역 태양시(경도 보정) 경계 시각 안내',
          description:
            '홀수 시 초반(00분~31분) 출생은 동경 135도 표준시 기준 시진과 한반도 경도(약 -30~32분) 보정 기준 시진이 서로 다를 수 있는 경계 구간입니다.',
        });

        boundaryAlternatives.push({
          reasonCode: 'SOLAR_TIME_SHICHEN_SENSITIVE',
          title: '태양시(경도 약 -32분) 보정 시 시주 후보',
          description: '기본 결과는 법정 표준시(보정 미적용) 기준이며, 경도 보정 적용 시 아래 시주가 됩니다.',
          candidatePillarsNote: `표준시 기준 시주: ${hourPillar.korean}(${hourPillar.hanja}) / 경도 보정 기준 시주: ${adjHourPillar.korean}(${adjHourPillar.hanja})`,
        });
      }
    }
  }

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  const fiveElements = computeSurfaceFiveElements(pillars);
  const inputPrecision = timeStatus === 'known' ? 'minute' : 'unknown-time';
  const { facts, readings } = buildValidatedFactsAndReadings({
    dayStem: dayPillar.heavenlyStem,
    monthBranch: monthPillar.earthlyBranch,
    fiveElements,
    inputPrecision,
    topic,
  });

  const originalDateLabel =
    calendar === 'solar'
      ? `양력 ${solarDate.year}년 ${solarDate.month}월 ${solarDate.day}일`
      : `음력 ${lunarDate.year}년 ${lunarDate.isLeapMonth ? '윤' : '평'}${lunarDate.month}월 ${lunarDate.day}일`;

  const chart: SajuChart = {
    schemaVersion: '1.0.0',
    engineVersion: 'manseryeok-2.0.0',
    calculationPolicyVersion: 'hakso-draft-v1',
    policyStatus: 'draft-pending-owner-confirmation',
    inputPrecision,
    normalizedInput: {
      calendar,
      originalDateLabel,
      solar: solarDate,
      lunar: lunarDate,
      timeLabel,
      birthRegion: 'KR',
      topic,
      civilOffsetMinutes,
      historicalTimeNote,
    },
    pillars,
    fiveElements,
    facts,
    limitations,
    boundaryAlternatives,
    readings,
  };

  return { ok: true, chart };
}
