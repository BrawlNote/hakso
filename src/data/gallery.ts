/**
 * 학소 철학관 대문 비주얼 및 갤러리 중앙 데이터 (단일 진실 공급원)
 *
 * 규칙 (ANTIGRAVITY_WORK_ORDER.md 3절, docs/01_REQUIREMENTS.md 6절):
 * - 실제 공간·인물 사진을 우선 사용하며, 실제 사진이 등록되기 전에는
 *   AI 인물/가짜 내부 사진으로 오인되지 않도록 자체 제작한 전통 수묵·도해 SVG 시안임을 명시한다.
 * - 모든 이미지의 출처와 저작권/사용권(`rightsNote`)을 기록한다.
 * - 갤러리 이미지 역시 무단 우클릭·드래그·외부 도용 방지 구역(`data-protected-content="true"`)으로 보호한다.
 */

export type GalleryCategory = '학소 상징·풍경' | '서재·공간 시안' | '명리·오행 도해';

export interface GalleryItem {
  readonly id: string;
  readonly title: string;
  readonly category: GalleryCategory;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly description: string;
  /** 실제 촬영 사진 여부 (false이면 시안 일러스트 배지 표시) */
  readonly isActualPhoto: false;
  readonly rightsNote: string;
  readonly featuredOnHome: boolean;
}

export const HERO_BANNER_IMAGE: GalleryItem = {
  id: 'hero-hakso-pavilion',
  title: '송학(松鶴)과 고요한 서재 — 학소(鶴巢) 대문도',
  category: '학소 상징·풍경',
  src: '/images/gallery/hero-hakso-pavilion.svg',
  width: 1200,
  height: 640,
  alt: '소나무와 학이 머무는 전통 산수와 서재를 표현한 학소 철학관 대문 일러스트 시안',
  description:
    '학이 깃드는 둥지(鶴巢)라는 상호의 의미를 담아, 소나무와 고요한 서재에서 시간의 이치를 살피는 인상을 한지 수묵 풍으로 구성한 대문 비주얼입니다. (실제 학소 공간 사진 촬영 후 교체 가능)',
  isActualPhoto: false,
  rightsNote: '학소 철학관 프로젝트 자체 제작 SVG 아트워크 (상업적 이용·수정 권리 보유)',
  featuredOnHome: true,
};

export const GALLERY_ITEMS: readonly GalleryItem[] = [
  HERO_BANNER_IMAGE,
  {
    id: 'space-study-desk',
    title: '만세력 고서와 서안(書案) 연구 공간',
    category: '서재·공간 시안',
    src: '/images/gallery/space-study-desk.svg',
    width: 800,
    height: 540,
    alt: '전통 원목 책상 위에 펼쳐진 만세력 서책과 문방사우를 표현한 서재 일러스트 시안',
    description:
      '출생 연·월·일·시와 절입 시각을 대조하며 내담자에게 보낼 이메일 서면 풀이를 차분히 정리하는 연구 책상 시안입니다.',
    isActualPhoto: false,
    rightsNote: '학소 철학관 프로젝트 자체 제작 SVG 아트워크 (상업적 이용·수정 권리 보유)',
    featuredOnHome: true,
  },
  {
    id: 'space-tea-room',
    title: '창호 너머 계절의 빛이 드는 다실(茶室)',
    category: '서재·공간 시안',
    src: '/images/gallery/space-tea-room.svg',
    width: 800,
    height: 540,
    alt: '한지 격자 창호와 다탁, 다관이 놓인 차분한 사유 공간 일러스트 시안',
    description:
      '복잡한 마음을 가라앉히고 삶의 우선순위를 차분한 질문으로 정돈하는 학소 철학관의 공간 분위기를 담은 시안입니다.',
    isActualPhoto: false,
    rightsNote: '학소 철학관 프로젝트 자체 제작 SVG 아트워크 (상업적 이용·수정 권리 보유)',
    featuredOnHome: true,
  },
  {
    id: 'saju-four-seasons',
    title: '사계절 절기와 오행(목·화·토·금·수) 순환도',
    category: '명리·오행 도해',
    src: '/images/gallery/saju-four-seasons.svg',
    width: 800,
    height: 540,
    alt: '목·화·토·금·수 오행과 봄·여름·환절기·가을·겨울의 순환 관계를 나타낸 명리 도해',
    description:
      '사주 명식의 천간과 지지가 계절(월지)의 흐름 속에서 어떻게 균형을 이루는지 보여주는 오행 상생 순환 도해입니다.',
    isActualPhoto: false,
    rightsNote: '학소 철학관 프로젝트 자체 제작 SVG 도해 (상업적 이용·수정 권리 보유)',
    featuredOnHome: true,
  },
];
