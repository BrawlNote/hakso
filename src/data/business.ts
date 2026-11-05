/**
 * 학소 철학관 중앙 사업 정보 (단일 진실 공급원)
 *
 * 규칙:
 * 1. 대표 정보(representativeName)와 상담 이메일(consultationEmail)은 사용자가 추후 제공하기 전까지
 *    반드시 빈 문자열("")로 유지하며, 화면에서 빈 레이블을 노출하지 않는다.
 * 2. 상담 이메일이 비어 있을 때는 절대 빈 `mailto:`나 임시 이메일 주소를 생성하지 않고,
 *    "이메일 상담 준비 중" 상태를 표시한다.
 * 3. 소재지(`서울 강북구 한천로 1167 3층`)는 확인된 주소이나, 초기 상담은 이메일 상담만 진행하므로
 *    방문 상담 접수로 오인되는 문구나 예약 버튼을 표시하지 않는다.
 */

export type ConsultationMode = 'email';

export interface BusinessInfo {
  readonly name: string;
  readonly shortName: string;
  readonly slogan: string;
  readonly description: string;
  readonly siteUrl: string;
  readonly address: {
    readonly full: string;
    readonly region: string;
    readonly street: string;
    readonly floor: string;
    readonly visitReceptionOpen: false;
    readonly note: string;
  };
  readonly consultationMode: ConsultationMode;
  /** 대표자명 — 사용자 추후 제공 전까지 공란("") 유지 */
  readonly representativeName: string;
  /** 상담 이메일 — 사용자 추후 제공 전까지 공란("") 유지 */
  readonly consultationEmail: string;
  /** 사업자등록번호 — 추후 확인 전까지 공란("") 유지 */
  readonly businessRegistrationNumber: string;
  /** 응대 시간 — 추후 확정 전까지 공란("") 유지 */
  readonly operatingHoursNote: string;
  readonly pricingPolicy: {
    readonly webSaju: '무료 제공';
    readonly emailConsultation: string;
  };
  readonly counselorProfile: {
    readonly publicTitle: string;
    readonly summary: string;
    readonly verifiedPrinciples: readonly string[];
  };
}

const resolvedSiteUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.SITE) ||
  (typeof process !== 'undefined' && process.env && process.env.SITE_URL) ||
  'https://hakso.kr';

export const BUSINESS_INFO: BusinessInfo = {
  name: '학소 철학관',
  shortName: '학소',
  slogan: '삶의 갈림길에서 사주 명리의 이치로 방향을 함께 살핍니다',
  description:
    '서울 강북구 한천로 1167 3층 소재 학소 철학관 공식 홈페이지입니다. 만세력 기반 무료 기본 사주 체험과 이메일 상담 안내를 제공합니다.',
  siteUrl: resolvedSiteUrl.replace(/\/+$/, ''),
  address: {
    full: '서울 강북구 한천로 1167 3층',
    region: '서울 강북구',
    street: '한천로 1167',
    floor: '3층',
    visitReceptionOpen: false,
    note: '현재 소재지 안내는 사업장 위치 정보 제공 목적이며, 초기 상담은 이메일 상담으로만 진행합니다. 사전 확정 없는 현장 방문 접수는 받지 않습니다.',
  },
  consultationMode: 'email',
  representativeName: '',
  consultationEmail: '',
  businessRegistrationNumber: '',
  operatingHoursNote: '',
  pricingPolicy: {
    webSaju: '무료 제공',
    emailConsultation: '상담 항목 및 세부 비용·회신 기한은 이메일 상담 개시 시 별도 안내 예정 (무료 아님·미정)',
  },
  counselorProfile: {
    publicTitle: '학소 철학관 상담 안내',
    summary:
      '과장된 예언이나 공포를 조장하는 풀이 대신, 출생 시점의 명식(命式) 구조와 현재 마주한 현실적 선택지를 차분하고 명료한 언어로 정리해 드립니다.',
    verifiedPrinciples: [
      '불확실한 출생 시각이나 경계 시각은 임의로 단정하지 않고 계산 가능한 범위와 한계를 먼저 밝힙니다.',
      '질병·사망·파산·이혼 등의 단정적 예언이나 투자·의료 지시를 하지 않으며, 내담자의 주체적 판단을 돕는 참고 자료로 풀이합니다.',
      '초기 상담은 서면(이메일) 방식으로 진행하여, 질문의 맥락과 명식 근거를 차분히 기록으로 남길 수 있도록 준비하고 있습니다.',
    ],
  },
};

/** 상담 이메일이 실제 입력되어 유효한지 확인 */
export function hasConsultationEmail(info: BusinessInfo = BUSINESS_INFO): boolean {
  const email = info.consultationEmail.trim();
  return email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 대표자 정보가 실제 입력되어 있는지 확인 */
export function hasRepresentativeName(info: BusinessInfo = BUSINESS_INFO): boolean {
  return info.representativeName.trim().length > 0;
}

/**
 * 이메일이 제공된 경우에만 안전한 mailto URI를 반환하고,
 * 공란 상태에서는 null을 반환하여 빈 mailto: 생성을 원천 차단한다.
 */
export function getSafeMailtoHref(info: BusinessInfo = BUSINESS_INFO): string | null {
  if (!hasConsultationEmail(info)) {
    return null;
  }
  const email = info.consultationEmail.trim();
  const subject = encodeURIComponent('[학소 철학관] 이메일 상담 문의');
  return `mailto:${email}?subject=${subject}`;
}

/**
 * 푸터 및 소개 영역에서 실제 값이 존재하는 항목만 반환 (빈 레이블 숨김 규칙)
 */
export function getVisibleBusinessFacts(info: BusinessInfo = BUSINESS_INFO): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [
    { label: '상호', value: info.name },
    { label: '소재지', value: info.address.full },
    { label: '초기 상담 방식', value: '이메일 상담 전용 (방문·전화 접수 미운영)' },
    { label: '홈페이지 사주 체험', value: info.pricingPolicy.webSaju },
  ];

  if (hasRepresentativeName(info)) {
    facts.splice(1, 0, { label: '대표', value: info.representativeName.trim() });
  }
  if (info.businessRegistrationNumber.trim().length > 0) {
    facts.push({ label: '사업자등록번호', value: info.businessRegistrationNumber.trim() });
  }
  if (hasConsultationEmail(info)) {
    facts.push({ label: '상담 이메일', value: info.consultationEmail.trim() });
  }
  if (info.operatingHoursNote.trim().length > 0) {
    facts.push({ label: '응대 안내', value: info.operatingHoursNote.trim() });
  }

  return facts;
}
