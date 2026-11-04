/**
 * 학소 철학관 만세력·사주 계산 모듈 타입 계약
 *
 * 기준 문서: docs/02_TECHNICAL_SPEC.md 2~3절
 */

import type { EarthlyBranch, FiveElement, HeavenlyStem, YinYang } from 'manseryeok';

export type CalendarType = 'solar' | 'lunar';
export type TimeStatus = 'known' | 'unknown';
export type BirthRegion = 'KR' | 'OTHER';
export type ConsultationTopicKey = 'general' | 'career' | 'relationship' | 'decision';

export interface SajuBirthInput {
  readonly calendar: CalendarType;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly isLeapMonth?: boolean;
  readonly timeStatus: TimeStatus;
  readonly hour?: number | null;
  readonly minute?: number | null;
  readonly birthRegion?: BirthRegion;
  readonly topic?: ConsultationTopicKey;
}

export type SajuErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_SOLAR_DATE'
  | 'INVALID_LUNAR_DATE'
  | 'NONEXISTENT_LEAP_MONTH'
  | 'FUTURE_BIRTH_DATE'
  | 'OUT_OF_SUPPORTED_RANGE'
  | 'UNSUPPORTED_BIRTH_REGION'
  | 'NONEXISTENT_LOCAL_TIME';

export interface SajuValidationError {
  readonly ok: false;
  readonly code: SajuErrorCode;
  readonly field: 'date' | 'calendar' | 'isLeapMonth' | 'time' | 'birthRegion' | 'general';
  readonly message: string;
  readonly recoveryHint: string;
}

export type LimitationCode =
  | 'DRAFT_POLICY_NOTICE'
  | 'UNKNOWN_BIRTH_TIME'
  | 'SOLAR_TERM_DAY_UNKNOWN_TIME'
  | 'SOLAR_TERM_BOUNDARY_NEAR'
  | 'LATE_ZI_BOUNDARY_SENSITIVE'
  | 'SOLAR_TIME_SHICHEN_SENSITIVE'
  | 'HISTORICAL_DST_APPLIED'
  | 'HISTORICAL_STANDARD_TIME_OFFSET'
  | 'AMBIGUOUS_DST_TIME'
  | 'PRE_1908_STANDARD_TIME';

export interface LimitationItem {
  readonly code: LimitationCode;
  readonly title: string;
  readonly description: string;
}

export interface PillarDetail {
  readonly heavenlyStem: HeavenlyStem;
  readonly earthlyBranch: EarthlyBranch;
  readonly stemHanja: string;
  readonly branchHanja: string;
  readonly korean: string;
  readonly hanja: string;
  readonly stemElement: FiveElement;
  readonly branchElement: FiveElement;
  readonly stemYinYang: YinYang;
  readonly branchYinYang: YinYang;
  readonly stemReading: string;
  readonly branchReading: string;
}

export interface FiveElementSummary {
  readonly scope: 'four-pillars-8chars' | 'three-pillars-6chars';
  readonly totalCharacters: 6 | 8;
  readonly counts: Readonly<Record<FiveElement, number>>;
  readonly dominantElements: readonly FiveElement[];
  readonly lackingElements: readonly FiveElement[];
  readonly note: string;
}

export interface ValidatedFact {
  readonly factId: string;
  readonly category: 'day-master' | 'season' | 'element-balance' | 'time-precision' | 'calendar';
  readonly label: string;
  readonly summary: string;
  readonly evidence: string;
}

export interface BoundaryAlternative {
  readonly reasonCode: LimitationCode;
  readonly title: string;
  readonly description: string;
  readonly candidatePillarsNote: string;
}

export interface BasicReadingSection {
  readonly id: string;
  readonly kind: 'day-master' | 'seasonal-context' | 'element-balance' | 'topic-guide';
  readonly title: string;
  readonly body: string;
  readonly evidenceFactIds: readonly string[];
  readonly contentStatus: 'sample-pending-owner-review';
}

export interface SajuChart {
  readonly schemaVersion: '1.0.0';
  readonly engineVersion: 'manseryeok-2.0.0';
  readonly calculationPolicyVersion: 'hakso-draft-v1';
  readonly policyStatus: 'draft-pending-owner-confirmation';
  readonly inputPrecision: 'minute' | 'unknown-time';
  readonly normalizedInput: {
    readonly calendar: CalendarType;
    readonly originalDateLabel: string;
    readonly solar: { readonly year: number; readonly month: number; readonly day: number };
    readonly lunar: {
      readonly year: number;
      readonly month: number;
      readonly day: number;
      readonly isLeapMonth: boolean;
    };
    readonly timeLabel: string;
    readonly birthRegion: 'KR';
    readonly topic: ConsultationTopicKey;
    readonly civilOffsetMinutes: number | null;
    readonly historicalTimeNote: string | null;
  };
  readonly pillars: {
    readonly year: PillarDetail;
    readonly month: PillarDetail;
    readonly day: PillarDetail;
    readonly hour: PillarDetail | null;
  };
  readonly fiveElements: FiveElementSummary;
  readonly facts: readonly ValidatedFact[];
  readonly limitations: readonly LimitationItem[];
  readonly boundaryAlternatives: readonly BoundaryAlternative[];
  readonly readings: readonly BasicReadingSection[];
}

export type SajuCalculationResult =
  | { readonly ok: true; readonly chart: SajuChart }
  | SajuValidationError;
