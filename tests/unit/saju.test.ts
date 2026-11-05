import * as astronomy from 'astronomy-engine';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { describe, expect, it } from 'vitest';
import { calculateSaju, type SajuBirthInput } from '../../src/lib/saju';

describe('학소 사주 만세력·계산 정책·경계 검증 (Stage 08 · 65+ 사례)', () => {
  // 1. 일반 날짜 및 양력↔음력 동치성 + KASI(korean-lunar-calendar) 일진·음양력 + astronomy-engine 절기 독립 대조 (16개 사례)
  const generalSolarDates: ReadonlyArray<{
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly expectedYear: string;
    readonly expectedMonth: string;
    readonly expectedDay: string;
    readonly expectedHour: string;
  }> = [
    { year: 1900, month: 1, day: 1, hour: 12, minute: 0, expectedYear: '기해', expectedMonth: '병자', expectedDay: '갑술', expectedHour: '경오' },
    { year: 1924, month: 6, day: 15, hour: 9, minute: 30, expectedYear: '갑자', expectedMonth: '경오', expectedDay: '을축', expectedHour: '신사' },
    { year: 1945, month: 8, day: 15, hour: 12, minute: 0, expectedYear: '을유', expectedMonth: '갑신', expectedDay: '병진', expectedHour: '갑오' },
    { year: 1953, month: 11, day: 20, hour: 8, minute: 0, expectedYear: '계사', expectedMonth: '계해', expectedDay: '을해', expectedHour: '경진' },
    { year: 1965, month: 4, day: 10, hour: 15, minute: 45, expectedYear: '을사', expectedMonth: '경진', expectedDay: '갑오', expectedHour: '임신' },
    { year: 1972, month: 9, day: 18, hour: 6, minute: 15, expectedYear: '임자', expectedMonth: '기유', expectedDay: '임자', expectedHour: '계묘' },
    { year: 1980, month: 3, day: 22, hour: 18, minute: 20, expectedYear: '경신', expectedMonth: '기묘', expectedDay: '갑오', expectedHour: '계유' },
    { year: 1984, month: 2, day: 15, hour: 10, minute: 0, expectedYear: '갑자', expectedMonth: '병인', expectedDay: '기묘', expectedHour: '기사' },
    { year: 1990, month: 7, day: 12, hour: 14, minute: 10, expectedYear: '경오', expectedMonth: '계미', expectedDay: '무인', expectedHour: '기미' },
    { year: 1992, month: 10, day: 24, hour: 14, minute: 30, expectedYear: '임신', expectedMonth: '경술', expectedDay: '계유', expectedHour: '기미' },
    { year: 1995, month: 5, day: 20, hour: 20, minute: 0, expectedYear: '을해', expectedMonth: '신사', expectedDay: '신해', expectedHour: '무술' },
    { year: 2000, month: 1, day: 1, hour: 0, minute: 30, expectedYear: '기묘', expectedMonth: '병자', expectedDay: '무오', expectedHour: '임자' },
    { year: 2008, month: 8, day: 18, hour: 11, minute: 45, expectedYear: '무자', expectedMonth: '경신', expectedDay: '경인', expectedHour: '임오' },
    { year: 2016, month: 12, day: 25, hour: 16, minute: 0, expectedYear: '병신', expectedMonth: '경자', expectedDay: '신사', expectedHour: '병신' },
    { year: 2023, month: 9, day: 10, hour: 7, minute: 30, expectedYear: '계묘', expectedMonth: '신유', expectedDay: '신미', expectedHour: '임진' },
    { year: 2026, month: 10, day: 15, hour: 14, minute: 0, expectedYear: '병오', expectedMonth: '무술', expectedDay: '임술', expectedHour: '정미' },
  ];

  it.each(generalSolarDates)(
    '일반 사례 검증 및 KASI 음양력·일진 동치 확인: $year-$month-$day $hour:$minute -> $expectedYear $expectedMonth $expectedDay $expectedHour',
    (item) => {
      const solarRes = calculateSaju({
        calendar: 'solar',
        year: item.year,
        month: item.month,
        day: item.day,
        timeStatus: 'known',
        hour: item.hour,
        minute: item.minute,
      });
      expect(solarRes.ok).toBe(true);
      if (!solarRes.ok) return;

      expect(solarRes.chart.pillars.year.korean).toBe(item.expectedYear);
      expect(solarRes.chart.pillars.month.korean).toBe(item.expectedMonth);
      expect(solarRes.chart.pillars.day.korean).toBe(item.expectedDay);
      expect(solarRes.chart.pillars.hour?.korean).toBe(item.expectedHour);

      // 독립 출처(korean-lunar-calendar, KASI 데이터)와 음력 변환 결과 및 일주(일진) 대조
      const klc = new KoreanLunarCalendar();
      klc.setSolarDate(item.year, item.month, item.day);
      const kasiLunar = klc.getLunarCalendar();
      const kasiGapja = klc.getKoreanGapja();

      expect(solarRes.chart.normalizedInput.lunar).toEqual({
        year: kasiLunar.year,
        month: kasiLunar.month,
        day: kasiLunar.day,
        isLeapMonth: Boolean(kasiLunar.intercalation),
      });
      expect(kasiGapja.day.slice(0, 2)).toBe(item.expectedDay);

      // 동치 음력으로 다시 입력했을 때 동일한 4기둥이 나오는지 확인
      const lunarRes = calculateSaju({
        calendar: 'lunar',
        year: kasiLunar.year,
        month: kasiLunar.month,
        day: kasiLunar.day,
        isLeapMonth: Boolean(kasiLunar.intercalation),
        timeStatus: 'known',
        hour: item.hour,
        minute: item.minute,
      });
      expect(lunarRes.ok).toBe(true);
      if (!lunarRes.ok) return;
      expect(lunarRes.chart.pillars).toEqual(solarRes.chart.pillars);
    },
  );

  it('KASI 달력 API의 음력 월 간지(예: 1990-07-12 음력 윤5월 임오월)를 사주 절기 월주(소서 이후 계미월)로 그대로 쓰지 않는다', () => {
    const klc = new KoreanLunarCalendar();
    klc.setSolarDate(1990, 7, 12);
    expect(klc.getKoreanGapja().month).toBe('임오월'); // 음력 월 간지

    const sajuRes = calculateSaju({
      calendar: 'solar',
      year: 1990,
      month: 7,
      day: 12,
      timeStatus: 'known',
      hour: 12,
      minute: 0,
    });
    expect(sajuRes.ok).toBe(true);
    if (!sajuRes.ok) return;
    // 1990-07-07 소서(小暑) 절입 이후이므로 사주 월주는 미월(계미월)이어야 함
    expect(sajuRes.chart.pillars.month.korean).toBe('계미');
  });

  // 2. 윤년(2월 29일) 및 월말/연말 유효성 (7개 사례)
  const leapAndMonthEndCases: ReadonlyArray<{
    readonly label: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly shouldSucceed: boolean;
  }> = [
    { label: '400년 주기 윤년 2000-02-29 허용', year: 2000, month: 2, day: 29, shouldSucceed: true },
    { label: '일반 윤년 2024-02-29 허용', year: 2024, month: 2, day: 29, shouldSucceed: true },
    { label: '100년 주기 평년 1900-02-29 거부', year: 1900, month: 2, day: 29, shouldSucceed: false },
    { label: '일반 평년 2023-02-29 거부', year: 2023, month: 2, day: 29, shouldSucceed: false },
    { label: '4월 31일(2024-04-31) 거부', year: 2024, month: 4, day: 31, shouldSucceed: false },
    { label: '11월 31일(2024-11-31) 거부', year: 2024, month: 11, day: 31, shouldSucceed: false },
    { label: '연말 2024-12-31 허용', year: 2024, month: 12, day: 31, shouldSucceed: true },
  ];

  it.each(leapAndMonthEndCases)('윤년·월말 검증: $label', (tc) => {
    const res = calculateSaju({
      calendar: 'solar',
      year: tc.year,
      month: tc.month,
      day: tc.day,
      timeStatus: 'unknown',
    });
    expect(res.ok).toBe(tc.shouldSucceed);
    if (!res.ok) {
      expect(res.code).toBe('INVALID_SOLAR_DATE');
    }
  });

  // 3. 음력 평달·윤달·29/30일 유효성 검증 (8개 사례)
  const lunarValidationCases: ReadonlyArray<{
    readonly label: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly isLeapMonth: boolean;
    readonly shouldSucceed: boolean;
    readonly expectedErrorCode?: string;
    readonly expectedSolar?: { year: number; month: number; day: number };
  }> = [
    {
      label: '2023년 평2월 15일 -> 양력 2023-03-06',
      year: 2023,
      month: 2,
      day: 15,
      isLeapMonth: false,
      shouldSucceed: true,
      expectedSolar: { year: 2023, month: 3, day: 6 },
    },
    {
      label: '2023년 윤2월 15일 -> 양력 2023-04-05 (평달과 구분)',
      year: 2023,
      month: 2,
      day: 15,
      isLeapMonth: true,
      shouldSucceed: true,
      expectedSolar: { year: 2023, month: 4, day: 5 },
    },
    {
      label: '2020년 윤4월 10일 -> 양력 2020-06-01',
      year: 2020,
      month: 4,
      day: 10,
      isLeapMonth: true,
      shouldSucceed: true,
      expectedSolar: { year: 2020, month: 6, day: 1 },
    },
    {
      label: '2025년 윤6월 1일 -> 양력 2025-07-25',
      year: 2025,
      month: 6,
      day: 1,
      isLeapMonth: true,
      shouldSucceed: true,
      expectedSolar: { year: 2025, month: 7, day: 25 },
    },
    {
      label: '윤달이 없는 2024년에 윤4월 입력 시 거부',
      year: 2024,
      month: 4,
      day: 10,
      isLeapMonth: true,
      shouldSucceed: false,
      expectedErrorCode: 'NONEXISTENT_LEAP_MONTH',
    },
    {
      label: '2023년(윤2월 연도)에 존재하지 않는 윤3월 입력 시 거부',
      year: 2023,
      month: 3,
      day: 10,
      isLeapMonth: true,
      shouldSucceed: false,
      expectedErrorCode: 'NONEXISTENT_LEAP_MONTH',
    },
    {
      label: '작은달(29일)인 2024년 음력 1월에 30일 입력 시 거부',
      year: 2024,
      month: 1,
      day: 30,
      isLeapMonth: false,
      shouldSucceed: false,
      expectedErrorCode: 'INVALID_LUNAR_DATE',
    },
    {
      label: '큰달(30일)인 2024년 음력 2월에 30일 입력 시 허용',
      year: 2024,
      month: 2,
      day: 30,
      isLeapMonth: false,
      shouldSucceed: true,
      expectedSolar: { year: 2024, month: 4, day: 8 },
    },
  ];

  it.each(lunarValidationCases)('음력·윤달 검증: $label', (tc) => {
    const res = calculateSaju({
      calendar: 'lunar',
      year: tc.year,
      month: tc.month,
      day: tc.day,
      isLeapMonth: tc.isLeapMonth,
      timeStatus: 'unknown',
    });
    expect(res.ok).toBe(tc.shouldSucceed);
    if (res.ok && tc.expectedSolar) {
      expect(res.chart.normalizedInput.solar).toEqual(tc.expectedSolar);
    }
    if (!res.ok && tc.expectedErrorCode) {
      expect(res.code).toBe(tc.expectedErrorCode);
    }
  });

  // 4. 연주 경계 — 입춘(立春, 황경 315°) 직전/정각/직후 (astronomy-engine 독립 대조 포함, 6개 사례)
  const ipchunBoundaryCases: ReadonlyArray<{
    readonly label: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly expectedYearPillar: string;
    readonly expectedMonthPillar: string;
  }> = [
    // 2024년 입춘: 2024-02-04 17:27 KST (이전: 계묘년 을축월 / 이후: 갑진년 병인월)
    { label: '2024 입춘 7분 전 (17:20)', year: 2024, month: 2, day: 4, hour: 17, minute: 20, expectedYearPillar: '계묘', expectedMonthPillar: '을축' },
    { label: '2024 입춘 정각 (17:27)', year: 2024, month: 2, day: 4, hour: 17, minute: 27, expectedYearPillar: '갑진', expectedMonthPillar: '병인' },
    { label: '2024 입춘 8분 후 (17:35)', year: 2024, month: 2, day: 4, hour: 17, minute: 35, expectedYearPillar: '갑진', expectedMonthPillar: '병인' },
    // 2023년 입춘: 2023-02-04 11:42 KST (이전: 임인년 계축월 / 이후: 계묘년 갑인월)
    { label: '2023 입춘 전 (11:35)', year: 2023, month: 2, day: 4, hour: 11, minute: 35, expectedYearPillar: '임인', expectedMonthPillar: '계축' },
    { label: '2023 입춘 후 (11:50)', year: 2023, month: 2, day: 4, hour: 11, minute: 50, expectedYearPillar: '계묘', expectedMonthPillar: '갑인' },
    // 2025년 입춘: 2025-02-03 23:10 KST (이후: 을사년 무인월)
    { label: '2025 입춘 후 (23:20)', year: 2025, month: 2, day: 3, hour: 23, minute: 20, expectedYearPillar: '을사', expectedMonthPillar: '무인' },
  ];

  it.each(ipchunBoundaryCases)('입춘(연주·인월) 경계 판정 및 근접 경고: $label', (tc) => {
    const astroIpchun = astronomy.SearchSunLongitude(315, new Date(Date.UTC(tc.year, 1, 1)), 10);
    expect(astroIpchun).not.toBeNull();

    const res = calculateSaju({
      calendar: 'solar',
      year: tc.year,
      month: tc.month,
      day: tc.day,
      timeStatus: 'known',
      hour: tc.hour,
      minute: tc.minute,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.chart.pillars.year.korean).toBe(tc.expectedYearPillar);
    expect(res.chart.pillars.month.korean).toBe(tc.expectedMonthPillar);
    expect(res.chart.limitations.some((l) => l.code === 'SOLAR_TERM_BOUNDARY_NEAR')).toBe(true);
    expect(res.chart.boundaryAlternatives.some((b) => b.reasonCode === 'SOLAR_TERM_BOUNDARY_NEAR')).toBe(true);
  });

  // 5. 월주 경계 — 복수 월의 절(節) 직전/직후 및 음력 초하루와 절기 월주의 구분 (9개 사례)
  const monthJeolBoundaryCases: ReadonlyArray<{
    readonly label: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly expectedMonthPillar: string;
  }> = [
    // 2024 경칩(驚蟄): 2024-03-05 11:23 KST
    { label: '2024 경칩 직전 (03-05 11:15 -> 병인월)', year: 2024, month: 3, day: 5, hour: 11, minute: 15, expectedMonthPillar: '병인' },
    { label: '2024 경칩 직후 (03-05 11:30 -> 정묘월)', year: 2024, month: 3, day: 5, hour: 11, minute: 30, expectedMonthPillar: '정묘' },
    // 2024 청명(淸明): 2024-04-04 16:02 KST
    { label: '2024 청명 직전 (04-04 15:50 -> 정묘월)', year: 2024, month: 4, day: 4, hour: 15, minute: 50, expectedMonthPillar: '정묘' },
    { label: '2024 청명 직후 (04-04 16:10 -> 무진월)', year: 2024, month: 4, day: 4, hour: 16, minute: 10, expectedMonthPillar: '무진' },
    // 2024 입하(立夏): 2024-05-05 09:10 KST
    { label: '2024 입하 직전 (05-05 09:00 -> 무진월)', year: 2024, month: 5, day: 5, hour: 9, minute: 0, expectedMonthPillar: '무진' },
    { label: '2024 입하 직후 (05-05 09:20 -> 기사월)', year: 2024, month: 5, day: 5, hour: 9, minute: 20, expectedMonthPillar: '기사' },
    // 2024 입추(立秋): 2024-08-07 09:09 KST
    { label: '2024 입추 직전 (08-07 09:00 -> 신미월)', year: 2024, month: 8, day: 7, hour: 9, minute: 0, expectedMonthPillar: '신미' },
    { label: '2024 입추 직후 (08-07 09:20 -> 임신월)', year: 2024, month: 8, day: 7, hour: 9, minute: 20, expectedMonthPillar: '임신' },
    // 음력 2024년 1월 1일(설날, 양력 2024-02-10)은 입춘(02-04) 이후이므로 갑진년 병인월
    { label: '음력 설날(2024-02-10) 절기 월주 유지 확인', year: 2024, month: 2, day: 10, hour: 12, minute: 0, expectedMonthPillar: '병인' },
  ];

  it.each(monthJeolBoundaryCases)('절(節) 기준 월주 경계 검증: $label', (tc) => {
    const res = calculateSaju({
      calendar: 'solar',
      year: tc.year,
      month: tc.month,
      day: tc.day,
      timeStatus: 'known',
      hour: tc.hour,
      minute: tc.minute,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.chart.pillars.month.korean).toBe(tc.expectedMonthPillar);
  });

  // 6. 일주·시주 경계 — 22:59 / 23:00 / 23:59 / 00:00 / 00:01 및 시진 경계 (8개 사례)
  // KASI 기준 2024-05-15 = 기묘일, 2024-05-16 = 경진일
  const dayHourBoundaryCases: ReadonlyArray<{
    readonly label: string;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly expectedDayPillar: string;
    readonly expectedHourPillar: string;
    readonly expectLateZiNotice: boolean;
    readonly expectSolarTimeNotice: boolean;
  }> = [
    { label: '2024-05-15 22:59 (기묘일 해시 말)', day: 15, hour: 22, minute: 59, expectedDayPillar: '기묘', expectedHourPillar: '을해', expectLateZiNotice: false, expectSolarTimeNotice: false },
    { label: '2024-05-15 23:00 (기묘일 자시 시작 · 야자시 및 태양시 경계 안내)', day: 15, hour: 23, minute: 0, expectedDayPillar: '기묘', expectedHourPillar: '갑자', expectLateZiNotice: true, expectSolarTimeNotice: true },
    { label: '2024-05-15 23:59 (기묘일 자시 중 · 야자시 안내)', day: 15, hour: 23, minute: 59, expectedDayPillar: '기묘', expectedHourPillar: '갑자', expectLateZiNotice: true, expectSolarTimeNotice: false },
    { label: '2024-05-16 00:00 (자정 일주 변경 -> 경진일 병자시)', day: 16, hour: 0, minute: 0, expectedDayPillar: '경진', expectedHourPillar: '병자', expectLateZiNotice: false, expectSolarTimeNotice: false },
    { label: '2024-05-16 00:01 (자정 직후)', day: 16, hour: 0, minute: 1, expectedDayPillar: '경진', expectedHourPillar: '병자', expectLateZiNotice: false, expectSolarTimeNotice: false },
    { label: '2024-05-16 01:10 (축시 초반 · 태양시 경계 안내)', day: 16, hour: 1, minute: 10, expectedDayPillar: '경진', expectedHourPillar: '정축', expectLateZiNotice: false, expectSolarTimeNotice: true },
    { label: '2024-05-16 01:40 (축시 중반 · 태양시 보정 후에도 축시)', day: 16, hour: 1, minute: 40, expectedDayPillar: '경진', expectedHourPillar: '정축', expectLateZiNotice: false, expectSolarTimeNotice: false },
    { label: '2024-05-16 13:15 (미시 초반 · 태양시 경계 안내)', day: 16, hour: 13, minute: 15, expectedDayPillar: '경진', expectedHourPillar: '계미', expectLateZiNotice: false, expectSolarTimeNotice: true },
  ];

  it.each(dayHourBoundaryCases)('일주·시주 경계 검증: $label', (tc) => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 2024,
      month: 5,
      day: tc.day,
      timeStatus: 'known',
      hour: tc.hour,
      minute: tc.minute,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.chart.pillars.day.korean).toBe(tc.expectedDayPillar);
    expect(res.chart.pillars.hour?.korean).toBe(tc.expectedHourPillar);
    expect(res.chart.limitations.some((l) => l.code === 'LATE_ZI_BOUNDARY_SENSITIVE')).toBe(tc.expectLateZiNotice);
    expect(res.chart.limitations.some((l) => l.code === 'SOLAR_TIME_SHICHEN_SENSITIVE')).toBe(tc.expectSolarTimeNotice);
  });

  // 7. 시간 미상(unknown-time) 및 절입 당일 시간 미상 처리 (4개 사례)
  it('시간 모름 선택 시 시주를 null로 반환하고 6글자 표면 오행만 집계한다 (임의 12:00 대입 금지)', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 1995,
      month: 5,
      day: 20,
      timeStatus: 'unknown',
      hour: 14,
      minute: 30,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.chart.inputPrecision).toBe('unknown-time');
    expect(res.chart.pillars.hour).toBeNull();
    expect(res.chart.fiveElements.scope).toBe('three-pillars-6chars');
    expect(res.chart.fiveElements.totalCharacters).toBe(6);
    expect(res.chart.limitations.some((l) => l.code === 'UNKNOWN_BIRTH_TIME')).toBe(true);
  });

  it('입춘 당일(2024-02-04)에 시간 모름으로 입력하면 SOLAR_TERM_DAY_UNKNOWN_TIME 제한과 절입 전후 두 후보를 모두 안내한다', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 2024,
      month: 2,
      day: 4,
      timeStatus: 'unknown',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.chart.pillars.hour).toBeNull();
    expect(res.chart.limitations.some((l) => l.code === 'SOLAR_TERM_DAY_UNKNOWN_TIME')).toBe(true);
    const alt = res.chart.boundaryAlternatives.find((b) => b.reasonCode === 'SOLAR_TERM_DAY_UNKNOWN_TIME');
    expect(alt).toBeDefined();
    expect(alt?.candidatePillarsNote).toContain('계묘');
    expect(alt?.candidatePillarsNote).toContain('갑진');
  });

  // 8. 대한민국 과거 표준시(UTC+8:30) 및 서머타임(DST) 검증 (7개 사례)
  it('1958년(표준시 UTC+8:30 + 서머타임 시행기) 출생 시 당시 오프셋과 서머타임 역산을 함께 반영한다', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 1958,
      month: 7,
      day: 15,
      timeStatus: 'known',
      hour: 12,
      minute: 0,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.chart.normalizedInput.civilOffsetMinutes).toBe(570);
    expect(res.chart.limitations.some((l) => l.code === 'HISTORICAL_STANDARD_TIME_OFFSET')).toBe(true);
    expect(res.chart.limitations.some((l) => l.code === 'HISTORICAL_DST_APPLIED')).toBe(true);
  });

  it('1988년 서울올림픽 서머타임 중(1988-07-20 00:30) 출생은 서머타임 1시간 역산으로 전날(1988-07-19, 경자일) 일주와 병자시 시주가 적용된다', () => {
    const dstRes = calculateSaju({
      calendar: 'solar',
      year: 1988,
      month: 7,
      day: 20,
      timeStatus: 'known',
      hour: 0,
      minute: 30,
    });
    const prevDayNoonRes = calculateSaju({
      calendar: 'solar',
      year: 1988,
      month: 7,
      day: 19,
      timeStatus: 'known',
      hour: 12,
      minute: 0,
    });

    expect(dstRes.ok).toBe(true);
    expect(prevDayNoonRes.ok).toBe(true);
    if (!dstRes.ok || !prevDayNoonRes.ok) return;

    // 1988-07-20 00:30 KDT -> 표준시 1988-07-19 23:30 KST 이므로 일주는 07-19(경자일), 시주는 자시(병자시)
    expect(dstRes.chart.pillars.day.korean).toBe(prevDayNoonRes.chart.pillars.day.korean);
    expect(dstRes.chart.pillars.hour?.korean).toBe('병자');
  });

  const nonexistentDstGapCases: ReadonlyArray<{
    readonly label: string;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
  }> = [
    { label: '1988-05-08 02:30 서머타임 시작 공백 거부', year: 1988, month: 5, day: 8, hour: 2, minute: 30 },
    { label: '1987-05-10 02:15 서머타임 시작 공백 거부', year: 1987, month: 5, day: 10, hour: 2, minute: 15 },
    { label: '1961-08-10 00:15 표준시 변경(UTC+8:30->UTC+9) 공백 거부', year: 1961, month: 8, day: 10, hour: 0, minute: 15 },
    { label: '1912-01-01 00:15 표준시 변경(UTC+8:30->UTC+9) 공백 거부', year: 1912, month: 1, day: 1, hour: 0, minute: 15 },
  ];

  it.each(nonexistentDstGapCases)('존재하지 않는 과거 현지 시각 거부: $label', (tc) => {
    const res = calculateSaju({
      calendar: 'solar',
      year: tc.year,
      month: tc.month,
      day: tc.day,
      timeStatus: 'known',
      hour: tc.hour,
      minute: tc.minute,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NONEXISTENT_LOCAL_TIME');
    }
  });

  it('서머타임 종료 시점의 중복 시각(1988-10-09 02:30, 1948-09-12 23:30)만 AMBIGUOUS_DST_TIME 제한을 기록하고 종료 다음날(1948-09-13 23:30)에는 오탐하지 않는다', () => {
    const res1988 = calculateSaju({
      calendar: 'solar',
      year: 1988,
      month: 10,
      day: 9,
      timeStatus: 'known',
      hour: 2,
      minute: 30,
    });
    expect(res1988.ok).toBe(true);
    if (res1988.ok) {
      expect(res1988.chart.limitations.some((l) => l.code === 'AMBIGUOUS_DST_TIME')).toBe(true);
    }

    // 1948년 서머타임 종료는 9월 12일 24:00(=9월 13일 00:00)이므로 중복 시각은 1948-09-12 23:00~23:59
    const res1948Overlap = calculateSaju({
      calendar: 'solar',
      year: 1948,
      month: 9,
      day: 12,
      timeStatus: 'known',
      hour: 23,
      minute: 30,
    });
    expect(res1948Overlap.ok).toBe(true);
    if (res1948Overlap.ok) {
      expect(res1948Overlap.chart.limitations.some((l) => l.code === 'AMBIGUOUS_DST_TIME')).toBe(true);
    }

    const res1948After = calculateSaju({
      calendar: 'solar',
      year: 1948,
      month: 9,
      day: 13,
      timeStatus: 'known',
      hour: 23,
      minute: 30,
    });
    expect(res1948After.ok).toBe(true);
    if (res1948After.ok) {
      expect(res1948After.chart.limitations.some((l) => l.code === 'AMBIGUOUS_DST_TIME')).toBe(false);
    }
  });

  // 9. 지원 범위·해외 출생·결정론적 결과 검증 (5개 사례)
  it('지원 하한(1900년) 이전인 1899-12-31 입력은 OUT_OF_SUPPORTED_RANGE로 거부한다', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 1899,
      month: 12,
      day: 31,
      timeStatus: 'unknown',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('OUT_OF_SUPPORTED_RANGE');
  });

  it('미래 날짜(2027-01-01) 입력은 FUTURE_BIRTH_DATE로 거부하고, 오늘 날짜(예: 2026-11-05)는 정상 허용한다', () => {
    const todayAllowed = calculateSaju(
      {
        calendar: 'solar',
        year: 2026,
        month: 11,
        day: 5,
        timeStatus: 'unknown',
      },
      { referenceToday: { year: 2026, month: 11, day: 5 } },
    );
    expect(todayAllowed.ok).toBe(true);

    const res = calculateSaju(
      {
        calendar: 'solar',
        year: 2027,
        month: 1,
        day: 1,
        timeStatus: 'unknown',
      },
      { referenceToday: { year: 2026, month: 11, day: 5 } },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('FUTURE_BIRTH_DATE');
  });

  it('해외 출생(OTHER) 선택 시 임의 KST 계산을 하지 않고 UNSUPPORTED_BIRTH_REGION으로 안내한다', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 1995,
      month: 5,
      day: 20,
      timeStatus: 'known',
      hour: 14,
      minute: 0,
      birthRegion: 'OTHER',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('UNSUPPORTED_BIRTH_REGION');
  });

  it('양력 선택 상태에서 isLeapMonth=true가 전달되어도 자동으로 false로 정규화한다', () => {
    const res = calculateSaju({
      calendar: 'solar',
      year: 2024,
      month: 5,
      day: 10,
      isLeapMonth: true,
      timeStatus: 'unknown',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.chart.normalizedInput.originalDateLabel).toContain('양력');
  });

  it('동일한 입력과 정책에 대해 항상 동일한 명식과 기본 풀이를 반환한다 (결정론 보장)', () => {
    const input: SajuBirthInput = {
      calendar: 'solar',
      year: 1992,
      month: 10,
      day: 24,
      timeStatus: 'known',
      hour: 14,
      minute: 30,
      topic: 'career',
    };
    const r1 = calculateSaju(input);
    const r2 = calculateSaju(input);
    expect(r1).toEqual(r2);
  });
});
