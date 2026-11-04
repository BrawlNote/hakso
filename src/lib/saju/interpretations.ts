/**
 * 학소 철학관 고정 기본 풀이 규칙 및 검수 대기 원고
 *
 * 규칙 (docs/02_TECHNICAL_SPEC.md 3.3절):
 * - 조건 → 근거 factId → 검수 원고 구조로 관리하며, 같은 입력·정책이면 항상 같은 기본 풀이가 나온다.
 * - 학소 운영자가 최종 검수하기 전이므로 `contentStatus: 'sample-pending-owner-review'`를 명시한다.
 * - 사망·질병·파산·이혼 확정, 투자 종목 지시, 치료/약 중단, 공포를 통한 결제 유도 문구를 절대 포함하지 않는다.
 */

import type { EarthlyBranch, HeavenlyStem } from 'manseryeok';
import type { BasicReadingSection, ConsultationTopicKey, FiveElementSummary, ValidatedFact } from './types';

interface StemProfile {
  readonly title: string;
  readonly summary: string;
  readonly body: string;
}

const DAY_MASTER_PROFILES: Readonly<Record<HeavenlyStem, StemProfile>> = Object.freeze({
  갑: {
    title: '갑목(甲木) 일간 — 곧게 뻗어 나가는 시작과 추진의 기질',
    summary: '명확한 목표와 성장 방향이 있을 때 에너지를 안정적으로 발휘하는 유형입니다.',
    body: '갑목 일간은 새로운 일을 기획하고 앞장서서 길을 여는 추진력이 돋보입니다. 스스로 납득한 기준이 분명할수록 흔들림이 적지만, 지나치게 책임감을 혼자 짊어지거나 완고해지지 않도록 완급을 조절하는 것이 삶과 일의 균형에 도움이 됩니다.',
  },
  을: {
    title: '을목(乙木) 일간 — 유연한 적응력과 끈기 있는 조화의 기질',
    summary: '변화하는 환경 속에서도 현실적인 해법을 찾고 관계를 이어가는 힘이 있습니다.',
    body: '을목 일간은 부드러운 소통과 세심한 관찰력으로 주변과 조화를 이루며 목표를 달성합니다. 당장의 속도보다 지속 가능한 환경을 만드는 데 강점이 있으며, 타인의 요구에 맞추느라 자신의 본래 우선순위를 미루지 않는 연습이 중요합니다.',
  },
  병: {
    title: '병화(丙火) 일간 — 밝게 드러나는 표현력과 열린 소통의 기질',
    summary: '상황을 투명하게 파악하고 주변에 활기를 전하는 분명한 에너지를 지녔습니다.',
    body: '병화 일간은 숨김없는 태도와 빠른 판단력으로 일의 흐름을 주도하는 경향이 있습니다. 시작의 열정이 크고 시야가 넓은 반면, 에너지를 한꺼번에 소진하기 쉬우므로 중요한 결정일수록 마무리의 세부 절차를 차분히 점검하는 습관이 유익합니다.',
  },
  정: {
    title: '정화(丁火) 일간 — 깊이 있는 집중력과 세밀한 통찰의 기질',
    summary: '내면의 기준이 뚜렷하며 한 가지 주제나 관계를 깊게 파고드는 집중력이 강점입니다.',
    body: '정화 일간은 겉으로 드러나는 화려함보다 실질적인 완성도와 정서적 신뢰를 중시합니다. 자신이 아끼는 일과 사람에게 깊은 정성을 기울이지만, 생각이 많아지면 내면의 피로가 쌓일 수 있으므로 고민을 객관화하여 정리하는 시간이 필요합니다.',
  },
  무: {
    title: '무토(戊土) 일간 — 묵직한 포용력과 중심을 지키는 신뢰의 기질',
    summary: '쉽게 흔들리지 않는 안정감으로 주변의 흐름을 받아들이고 중재하는 힘이 있습니다.',
    body: '무토 일간은 넓은 시야와 참을성을 바탕으로 장기적인 과제를 감당하는 데 강점이 있습니다. 한 번 정한 방향을 꾸준히 밀고 나가는 신뢰감을 주지만, 변화를 미루거나 혼자 속으로만 감내하기 쉬우므로 전환기에는 구체적인 행동 기한을 정하는 것이 좋습니다.',
  },
  기: {
    title: '기토(己土) 일간 — 실속 있는 관리력과 세심하게 가꾸는 기질',
    summary: '현실적인 조건을 꼼꼼히 살피고 일상의 기반을 단단하게 다지는 능력이 뛰어납니다.',
    body: '기토 일간은 실무적인 감각과 배려심이 깊어 주어진 자원을 효율적으로 정리하고 키워냅니다. 세부 사항을 놓치지 않는 장점이 있으나 걱정이 앞서면 실행이 늦어질 수 있으므로, 완벽한 조건보다 실행 가능한 첫 단계를 먼저 밟는 태도가 도움이 됩니다.',
  },
  경: {
    title: '경금(庚金) 일간 — 분명한 결단력과 핵심을 짚어내는 실행의 기질',
    summary: '복잡한 상황에서 핵심을 빠르게 구분하고 원칙에 따라 결단하는 힘이 있습니다.',
    body: '경금 일간은 맺고 끊음이 분명하며 어려운 과제 앞에서도 정면으로 돌파하려는 의지가 강합니다. 정의감과 책임감이 뚜렷해 신뢰를 얻지만, 기준이 엄격해지면 자신과 타인에게 여유가 부족해질 수 있으므로 과정의 유연함을 함께 살피는 것이 중요합니다.',
  },
  신: {
    title: '신금(辛金) 일간 — 정교한 완성도와 분별력 있는 안목의 기질',
    summary: '세밀한 기준과 예리한 분석력으로 완성도 높은 결과를 만들어내는 유형입니다.',
    body: '신금 일간은 핵심 가치를 정확히 짚어내고 품격과 질서를 유지하려는 성향이 뚜렷합니다. 전문성을 요하는 일이나 정밀한 판단에서 강점을 발휘하며, 지나친 자기 검열로 에너지를 소모하지 않도록 수용의 폭을 넓히는 것이 마음의 여유를 돕습니다.',
  },
  임: {
    title: '임수(壬水) 일간 — 넓은 포용력과 유연하게 길을 찾는 지혜의 기질',
    summary: '다양한 가능성을 열어 두고 큰 흐름을 읽으며 유연하게 대처하는 힘이 있습니다.',
    body: '임수 일간은 사고의 폭이 넓고 새로운 정보나 변화를 자연스럽게 수용합니다. 기획력과 임기응변이 뛰어나 여러 영역을 아우를 수 있으나, 선택지가 너무 많아지면 에너지가 분산될 수 있으므로 핵심 우선순위 한두 가지를 명확히 고정하는 것이 좋습니다.',
  },
  계: {
    title: '계수(癸水) 일간 — 섬세한 공감력과 본질을 스며들듯 파악하는 기질',
    summary: '조용한 관찰과 깊은 사유를 통해 상황의 이면과 사람의 마음을 읽는 데 강점이 있습니다.',
    body: '계수 일간은 차분하고 지혜로운 태도로 환경에 스며들며 실질적인 해법을 찾아냅니다. 직관력과 기획의 섬세함이 돋보이지만, 주변 분위기에 민감하게 영향받을 수 있으므로 자신만의 규칙적인 생활 리듬과 독립된 휴식 시간을 지키는 것이 중요합니다.',
  },
});

const SEASON_BY_BRANCH: Readonly<Record<EarthlyBranch, { seasonName: string; summary: string; body: string }>> =
  Object.freeze({
    인: {
      seasonName: '초봄(寅月, 인월)',
      summary: '새로운 계획을 세우고 성장을 시작하는 봄의 초입 기운이 바탕에 자리합니다.',
      body: '월지가 인월(寅月)에 해당하여 삶의 태도에서 발전과 시작, 미래 지향적인 동기를 중요하게 여기는 흐름을 보입니다.',
    },
    묘: {
      seasonName: '한봄(卯月, 묘월)',
      summary: '생동감이 활발하게 뻗어 나가며 관계와 활동 반경을 넓히는 봄의 기운입니다.',
      body: '월지가 묘월(卯月)에 해당하여 주변과의 교류, 학습, 자기표현을 통해 일상의 활력을 얻는 경향이 뚜렷합니다.',
    },
    진: {
      seasonName: '늦봄(辰月, 진월)',
      summary: '발산하던 봄의 기운을 정돈하여 현실적인 기반으로 연결하는 환절기의 기운입니다.',
      body: '월지가 진월(辰月)에 해당하여 다양한 요소들을 조율하고 아이디어를 실질적인 생활 구조로 안착시키는 역할을 중시합니다.',
    },
    사: {
      seasonName: '초여름(巳月, 사월)',
      summary: '활동력이 본격적으로 확장되고 사회적 성취와 표현에 관심이 모이는 시기입니다.',
      body: '월지가 사월(巳月)에 해당하여 목표를 향한 실행 속도가 빠르고 외부 활동에서 분명한 역할을 맡으려는 성향이 나타납니다.',
    },
    오: {
      seasonName: '한여름(午月, 오월)',
      summary: '드러나는 에너지와 집중도가 가장 높은 시기로, 명확한 기준과 열정을 중시합니다.',
      body: '월지가 오월(午月)에 해당하여 자신의 역량을 분명하게 검증받고자 하며, 열정을 쏟은 뒤 충분한 재충전 주기를 확보하는 것이 중요합니다.',
    },
    미: {
      seasonName: '늦여름(未月, 미월)',
      summary: '확장된 활동을 성숙시키고 결실을 준비하는 여름의 마무리 기운입니다.',
      body: '월지가 미월(未月)에 해당하여 열정적인 실행 뒤에서 실속과 지속 가능성을 함께 점검하는 신중함을 지닙니다.',
    },
    신: {
      seasonName: '초가을(申月, 신월)',
      summary: '확장보다 결실과 효율, 현실적인 구분과 정리를 중시하는 가을의 시작 기운입니다.',
      body: '월지가 신월(申月)에 해당하여 일의 구조와 실용성을 빠르게 파악하고 불필요한 소모를 줄이는 판단력이 돋보입니다.',
    },
    유: {
      seasonName: '한가을(酉月, 유월)',
      summary: '완성도와 명확한 기준, 세밀한 마무리를 중요하게 여기는 깊어진 가을 기운입니다.',
      body: '월지가 유월(酉月)에 해당하여 맡은 일의 정확성과 품질을 높이는 데 강점이 있으며, 분명한 원칙 속에서 안정감을 느낍니다.',
    },
    술: {
      seasonName: '늦가을(戌月, 술월)',
      summary: '거두어들인 결실을 갈무리하고 내면의 가치와 원칙을 지키는 환절기 기운입니다.',
      body: '월지가 술월(戌月)에 해당하여 신뢰할 수 있는 관계와 검증된 기준을 중시하며, 장기적인 안목으로 삶을 정리하는 힘이 있습니다.',
    },
    해: {
      seasonName: '초겨울(亥月, 해월)',
      summary: '지혜를 축적하고 다음 주기를 위한 준비와 사유가 깊어지는 겨울의 시작 기운입니다.',
      body: '월지가 해월(亥月)에 해당하여 겉으로 드러나는 결과 못지않게 내면의 배움과 장기적인 방향 설정을 깊이 고민하는 성향을 보입니다.',
    },
    자: {
      seasonName: '한겨울(子月, 자월)',
      summary: '응축된 집중력과 본질에 대한 탐구, 차분한 기획력이 돋보이는 겨울의 중심 기운입니다.',
      body: '월지가 자월(子月)에 해당하여 감정에 휩쓸리기보다 이성적인 숙고와 철저한 준비를 거쳐 움직이려는 신중함이 바탕에 있습니다.',
    },
    축: {
      seasonName: '늦겨울(丑月, 축월)',
      summary: '인내심 있게 내실을 다지며 다가올 봄의 시작을 준비하는 겨울의 갈무리 기운입니다.',
      body: '월지가 축월(丑月)에 해당하여 단기적인 변화에 일희일비하지 않고 묵묵히 실력을 쌓아 결과를 만들어내는 지구력이 강점입니다.',
    },
  });

const TOPIC_GUIDES: Readonly<Record<ConsultationTopicKey, { title: string; bodyPrefix: string }>> = Object.freeze({
  general: {
    title: '종합 명식 점검 및 상담 준비 안내',
    bodyPrefix:
      '전체 명식을 살필 때는 타고난 일간의 성향과 계절적 배경이 현재의 생활 환경과 어떻게 맞물리는지 확인하는 것이 우선입니다.',
  },
  career: {
    title: '진로·직업 방향 점검을 위한 안내',
    bodyPrefix:
      '진로와 일의 방식을 고민할 때는 일간이 에너지를 쓰는 방식과 월지의 사회적 환경 요건을 현재 고려 중인 선택지와 대조해 보는 것이 좋습니다.',
  },
  relationship: {
    title: '대인관계·소통 균형을 위한 안내',
    bodyPrefix:
      '관계에서의 피로도를 줄이려면 내가 중요하게 여기는 소통 기준과 상대에게 기대하는 역할의 범위를 명식 구조에 비추어 객관화해 볼 필요가 있습니다.',
  },
  decision: {
    title: '전환기 선택과 우선순위 정리를 위한 안내',
    bodyPrefix:
      '여러 선택지 앞에서 결정을 내려야 할 때는 단기적 불안보다 내 명식이 안정감을 느끼는 리듬과 감당 가능한 책임의 크기를 먼저 점검하는 것이 유익합니다.',
  },
});

export function buildValidatedFactsAndReadings(params: {
  readonly dayStem: HeavenlyStem;
  readonly monthBranch: EarthlyBranch;
  readonly fiveElements: FiveElementSummary;
  readonly inputPrecision: 'minute' | 'unknown-time';
  readonly topic: ConsultationTopicKey;
}): {
  readonly facts: readonly ValidatedFact[];
  readonly readings: readonly BasicReadingSection[];
} {
  const { dayStem, monthBranch, fiveElements, inputPrecision, topic } = params;
  const stemProfile = DAY_MASTER_PROFILES[dayStem];
  const seasonProfile = SEASON_BY_BRANCH[monthBranch];
  const topicGuide = TOPIC_GUIDES[topic];

  const dominantText =
    fiveElements.dominantElements.length > 0
      ? `상대적으로 두드러지는 오행은 ${fiveElements.dominantElements.join('·')}입니다.`
      : '특정 오행으로의 쏠림이 크지 않은 분포입니다.';
  const lackingText =
    fiveElements.lackingElements.length > 0
      ? `표면 글자 기준 비어 있는 오행은 ${fiveElements.lackingElements.join('·')}이며(확인 범위: ${fiveElements.totalCharacters}글자), 이는 절대적 결핍이 아니라 의식적으로 보완하면 좋은 생활 태도를 뜻합니다.`
      : `확인된 ${fiveElements.totalCharacters}글자 안에 목·화·토·금·수 오행이 고루 포함되어 있습니다.`;

  const facts: ValidatedFact[] = [
    {
      factId: `day-master-${dayStem}`,
      category: 'day-master',
      label: `일간(日干): ${dayStem}`,
      summary: stemProfile.summary,
      evidence: `일주 천간 '${dayStem}' 기준`,
    },
    {
      factId: `month-branch-${monthBranch}`,
      category: 'season',
      label: `월지(月支): ${monthBranch} (${seasonProfile.seasonName})`,
      summary: seasonProfile.summary,
      evidence: `절입 기준 월주 지지 '${monthBranch}'`,
    },
    {
      factId: `surface-elements-${fiveElements.totalCharacters}chars`,
      category: 'element-balance',
      label: `표면 오행 분포 (${fiveElements.totalCharacters}글자 기준)`,
      summary: `${dominantText} ${lackingText}`,
      evidence: `목(${fiveElements.counts.목})·화(${fiveElements.counts.화})·토(${fiveElements.counts.토})·금(${fiveElements.counts.금})·수(${fiveElements.counts.수})`,
    },
    {
      factId: `precision-${inputPrecision}`,
      category: 'time-precision',
      label: inputPrecision === 'minute' ? '출생 시각 반영 (사주 8글자)' : '출생 시간 미상 (삼주 6글자)',
      summary:
        inputPrecision === 'minute'
          ? '출생 시·분을 반영하여 시주(時柱)까지 4기둥을 산출했습니다.'
          : '출생 시각 미상으로 시주(時柱)를 임의 생성하지 않고 연·월·일 3기둥 기준으로만 분석했습니다.',
      evidence: `inputPrecision=${inputPrecision}`,
    },
  ];

  const readings: BasicReadingSection[] = [
    {
      id: 'reading-day-master',
      kind: 'day-master',
      title: stemProfile.title,
      body: stemProfile.body,
      evidenceFactIds: [`day-master-${dayStem}`],
      contentStatus: 'sample-pending-owner-review',
    },
    {
      id: 'reading-seasonal-context',
      kind: 'seasonal-context',
      title: `태어난 계절의 배경 — ${seasonProfile.seasonName}`,
      body: `${seasonProfile.summary} ${seasonProfile.body}`,
      evidenceFactIds: [`month-branch-${monthBranch}`],
      contentStatus: 'sample-pending-owner-review',
    },
    {
      id: 'reading-element-balance',
      kind: 'element-balance',
      title: `오행의 구성과 균형 (${fiveElements.totalCharacters === 8 ? '사주 8글자' : '삼주 6글자'} 표면 기준)`,
      body: `${dominantText} ${lackingText} ${
        inputPrecision === 'unknown-time'
          ? '출생 시각이 확인되면 시주의 두 글자가 추가되어 오행의 비중이 달라질 수 있으므로, 현재 결과는 연·월·일 삼주 범위의 기본 참고 지표로 활용해 주세요.'
          : '지장간이나 대운의 흐름까지 결합한 심층 해석은 개인의 실제 환경과 질문을 함께 대조하는 개별 상담에서 구체화할 수 있습니다.'
      }`,
      evidenceFactIds: [`surface-elements-${fiveElements.totalCharacters}chars`, `precision-${inputPrecision}`],
      contentStatus: 'sample-pending-owner-review',
    },
    {
      id: 'reading-topic-guide',
      kind: 'topic-guide',
      title: topicGuide.title,
      body: `${topicGuide.bodyPrefix} 무료 기본 풀이는 명식의 고정된 기초 구조를 확인하는 단계이며, 개인의 구체적인 상황과 선택 시점을 다루는 서면 상담이 필요하신 경우 이메일 상담 안내를 참고해 주세요.`,
      evidenceFactIds: [`day-master-${dayStem}`, `month-branch-${monthBranch}`, `precision-${inputPrecision}`],
      contentStatus: 'sample-pending-owner-review',
    },
  ];

  return { facts, readings };
}
