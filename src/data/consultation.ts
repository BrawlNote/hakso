/**
 * 학소 철학관 상담 주제 및 이메일 상담 절차 정의
 *
 * 주의:
 * - 홈페이지 무료 사주 체험과 개별 이메일 상담은 구분한다.
 * - 이메일 상담의 구체적 요금·회신 기한은 운영자 확정 전이므로 임의의 금액이나 시간을 단정하지 않는다.
 */

export interface ConsultationTopic {
  readonly id: 'general' | 'career' | 'relationship' | 'Decision' | 'timing';
  readonly slug: 'general' | 'career' | 'relationship' | 'decision' | 'timing';
  readonly title: string;
  readonly subtitle: string;
  readonly targetConcerns: readonly string[];
  readonly whatWeExamine: string;
  readonly preparationGuide: string;
}

export const CONSULTATION_TOPICS: readonly ConsultationTopic[] = [
  {
    id: 'general',
    slug: 'general',
    title: '종합 명식과 삶의 기조',
    subtitle: '타고난 일간·월지의 성향과 오행의 균형을 살핍니다',
    targetConcerns: [
      '내 사주 명식의 기본 구조와 강점·보완점을 차분히 이해하고 싶을 때',
      '단기적인 길흉보다 삶에서 반복되는 선택의 경향성을 점검하고 싶을 때',
    ],
    whatWeExamine:
      '출생 연·월·일·시(시간 미상 시 3주 기준)의 천간·지지 구성과 계절적 배경을 바탕으로 기질적 특성과 생활 리듬의 균형점을 정리합니다.',
    preparationGuide:
      '양력 또는 음력(윤달 여부 포함) 생년월일과 가능한 경우 출생 시각, 그리고 현재 가장 중점적으로 돌아보고 싶은 삶의 영역을 적어 주시면 됩니다.',
  },
  {
    id: 'career',
    slug: 'career',
    title: '진로·직업·일하는 방식',
    subtitle: '적성에 맞는 역할과 환경, 일의 지속 가능성을 점검합니다',
    targetConcerns: [
      '이직·전직·독립 등 일의 환경을 바꾸기 전 나에게 맞는 업무 방식을 고민할 때',
      '조직 내 역할과 개인 역량 발휘 사이에서 우선순위를 정리하고 싶을 때',
    ],
    whatWeExamine:
      '명식에서 드러나는 표현력·실행력·책임 수용 방식과 현재 고민 중인 진로 선택지의 성격을 대조하여 무리 없는 방향을 함께 모색합니다.',
    preparationGuide:
      '현재 종사 중인 분야(또는 준비 중인 영역)와 고려하고 있는 선택지 1~2가지를 구체적으로 적어 주시면 맥락에 맞는 답변에 도움이 됩니다.',
  },
  {
    id: 'relationship',
    slug: 'relationship',
    title: '대인관계·소통과 거리감',
    subtitle: '사람 사이의 갈등 요인과 건강한 관계 맺기 방식을 살핍니다',
    targetConcerns: [
      '가족·동료·연인 등 가까운 관계에서 반복되는 소통의 어려움을 줄이고 싶을 때',
      '타인의 기대와 내 삶의 기준 사이에서 적절한 경계를 세우고 싶을 때',
    ],
    whatWeExamine:
      '내가 에너지를 쓰는 방향과 타인에게 기대하는 바를 명식 구조에 비추어 살피고, 관계에서 소모를 줄이는 현실적인 태도를 정리합니다.',
    preparationGuide:
      '제3자의 동의 없는 민감한 개인정보 기재는 피해 주시고, 본인이 관계에서 겪는 상황과 고민 질문을 중심으로 작성해 주세요.',
  },
  {
    id: 'Decision',
    slug: 'decision',
    title: '전환기 선택과 우선순위 정리',
    subtitle: '복잡하게 얽힌 고민을 차분한 질문으로 정돈합니다',
    targetConcerns: [
      '여러 선택지 앞에서 무엇을 기준으로 결정해야 할지 마음이 복잡할 때',
      '감정적 불안을 가라앉히고 중장기적 관점에서 실행 순서를 세우고 싶을 때',
    ],
    whatWeExamine:
      '당장 서둘러야 할 부분과 시간을 두고 지켜보아야 할 부분을 구분하여, 과도한 불안 없이 스스로 결정을 내릴 수 있도록 기준점을 제시합니다.',
    preparationGuide:
      '고민하고 있는 선택지들과 각 선택지에서 가장 우려되는 현실적 조건을 함께 적어 주시면 더욱 명확한 정리가 가능합니다.',
  },
];

export interface EmailConsultationStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly description: string;
  readonly statusNote: string;
}

export const EMAIL_CONSULTATION_STEPS: readonly EmailConsultationStep[] = [
  {
    stepNumber: 1,
    title: '상담 안내 및 준비 사항 확인',
    description:
      '상담 안내 페이지에서 학소의 상담 원칙, 진행 가능한 주제, 출생 정보(양/음력·윤달·출생 시각 또는 시간 모름) 준비 방법을 먼저 확인합니다.',
    statusNote: '홈페이지의 무료 사주 체험과 개별 이메일 상담은 별도 과정입니다.',
  },
  {
    stepNumber: 2,
    title: '이메일 문의 작성 및 발송',
    description:
      '상담 이메일 주소가 공개되면 본인 메일 앱에서 생년월일시(또는 시간 모름)와 구체적인 상담 질문을 작성하여 발송합니다.',
    statusNote:
      '주의: 홈페이지에서 메일 작성 창을 열거나 주소를 복사한 것만으로는 문의가 발송·접수되지 않습니다. 현재는 상담 이메일 준비 중입니다.',
  },
  {
    stepNumber: 3,
    title: '운영자 접수 확인 및 진행·비용 안내',
    description:
      '보내주신 문의 내용을 학소에서 확인한 뒤, 상담 가능 범위·세부 비용·예상 회신 일정을 이메일로 회신하여 안내합니다.',
    statusNote: '자동 접수 DB나 자동 결제를 사용하지 않으며, 운영자가 직접 확인 후 회신합니다.',
  },
  {
    stepNumber: 4,
    title: '상담 진행 확정 및 서면 답변 전달',
    description:
      '안내드린 진행 조건과 절차가 확정되면, 명식 분석과 질문에 대한 서면 풀이를 정리하여 이메일로 전달합니다.',
    statusNote: '상담 항목별 요금과 회신 기한은 상담 개시 시점에 명확히 공지됩니다.',
  },
];
