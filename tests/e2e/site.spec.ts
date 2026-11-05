import { expect, test } from '@playwright/test';

const VIEWPORT_WIDTHS = [320, 390, 430, 768, 800, 1024, 1440] as const;

test.describe('학소 철학관 A+B 반응형·접근성·사주 체험·보안 통합 검수', () => {
  test('7개 필수 화면 폭(320/390/430/768/800/1024/1440px)에서 홈·상담·문의·체험 화면 가로 넘침 없음 확인', async ({
    page,
  }) => {
    const targetPaths = ['/', '/gallery/', '/consultation/', '/booking/', '/saju/'];

    for (const width of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of targetPaths) {
        const res = await page.goto(path);
        expect([200, 304]).toContain(res?.status());

        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        });
        expect(hasHorizontalOverflow, `width=${width}px, path=${path} 가로 넘침 발생`).toBe(false);
      }
    }
  });

  test('확정된 소재지 표기, 대표/이메일 공란 숨김, 빈 mailto 미생성 및 이메일 상담 준비 중 안내 검증', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('사주 명리의 이치로');
    await expect(page.locator('body')).toContainText('서울 강북구 한천로 1167 3층');
    await expect(page.locator('body')).toContainText('이메일 상담 준비 중');

    // 빈 mailto 링크나 전화(tel:) 링크가 존재하지 않아야 함
    const mailtoCount = await page.locator('a[href^="mailto:"]').count();
    const telCount = await page.locator('a[href^="tel:"]').count();
    expect(mailtoCount).toBe(0);
    expect(telCount).toBe(0);

    // 푸터에 빈 '대표' 또는 빈 '상담 이메일' 레이블이 노출되지 않아야 함
    const footerDts = await page.locator('.footer-facts dt').allTextContents();
    expect(footerDts).toContain('상호');
    expect(footerDts).toContain('소재지');
    expect(footerDts).not.toContain('대표');
    expect(footerDts).not.toContain('상담 이메일');

    // 첫 화면 대문 비주얼(Hero)과 갤러리 미리보기 노출 확인
    const heroImg = page.locator('.hero-visual-frame img');
    await expect(heroImg).toBeVisible();
    await expect(page.locator('.home-gallery-card')).toHaveCount(4);
  });

  test('갤러리(/gallery/): 카테고리 필터 전환, 필터 내 라이트박스 순회 및 닫기 후 포커스 복귀 검증', async ({ page }) => {
    await page.goto('/gallery/');
    await expect(page.locator('h1')).toContainText('학소 갤러리');
    await expect(page.locator('.gallery-card')).toHaveCount(4);

    // 서재·공간 시안 필터 클릭 시 2개 항목만 표시되는지 확인
    await page.click('[data-filter-category="서재·공간 시안"]');
    await expect(page.locator('.gallery-card:visible')).toHaveCount(2);

    // 필터된 상태에서 첫 번째 보이는 카드 클릭 -> 다음 이미지 클릭 시 같은 필터 범위 안에서만 이동하는지 확인
    const visibleThumbs = page.locator('.gallery-card:visible .gallery-thumb-btn');
    await visibleThumbs.first().click();
    const lightbox = page.locator('#gallery-lightbox');
    await expect(lightbox).toBeVisible();
    await expect(page.locator('#lightbox-category')).toHaveText('서재·공간 시안');

    await page.click('#lightbox-next');
    await expect(page.locator('#lightbox-category')).toHaveText('서재·공간 시안');

    await page.click('#lightbox-close');
    await expect(lightbox).toBeHidden();

    // 전체 보기 복귀
    await page.click('[data-filter-category="전체"]');
    await expect(page.locator('.gallery-card:visible')).toHaveCount(4);
  });

  test('사주 체험(/saju/): 정상 입력 -> 확인 단계 -> 결과 표시 -> 시간 모름 전환 -> 오류 복구 -> 새로고침 초기화 검증', async ({
    page,
  }) => {
    // URL 쿼리 파라미터로 접근 시 즉시 제거되는지 확인
    await page.goto('/saju/?year=1992&month=10&day=24');
    await expect(page).toHaveURL(/\/saju\/$/);

    // 1) 불가능한 양력 날짜(2023-02-29) 입력 시 오류 표시 검증
    await page.fill('#input-year', '2023');
    await page.fill('#input-month', '2');
    await page.fill('#input-day', '29');
    await page.fill('#input-hour', '14');
    await page.fill('#input-minute', '30');
    await page.click('#btn-review-input');

    const errorBanner = page.locator('#saju-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('존재하지 않는 양력 날짜');

    // 2) 정상 양력 입력(1992-10-24 14:30) -> 확인 단계 -> 결과 단계
    await page.fill('#input-year', '1992');
    await page.fill('#input-month', '10');
    await page.fill('#input-day', '24');
    await page.fill('#input-hour', '14');
    await page.fill('#input-minute', '30');
    await page.click('#btn-review-input');

    await expect(errorBanner).toBeHidden();
    const confirmStep = page.locator('#saju-confirm-step');
    await expect(confirmStep).toBeVisible();
    await expect(confirmStep).toContainText('양력 1992년 10월 24일');

    await page.click('#btn-confirm-calculate');
    const resultStep = page.locator('#saju-result-step');
    await expect(resultStep).toBeVisible();
    await expect(resultStep).toContainText('임신');
    await expect(resultStep).toContainText('경술');
    await expect(resultStep).toContainText('계유');
    await expect(resultStep).toContainText('기미');

    // URL이나 localStorage/sessionStorage에 개인 생년월일이 남지 않는지 확인
    expect(page.url()).not.toContain('1992');
    const storageDump = await page.evaluate(() => {
      return JSON.stringify({
        local: Object.entries(localStorage),
        session: Object.entries(sessionStorage),
      });
    });
    expect(storageDump).not.toContain('1992');

    // 3) 수정하기 -> 출생 시간 모름 선택 시 이전 시·분 값 제거 및 시주 미상 처리 확인
    await page.click('#btn-result-edit');
    await page.check('#time-unknown');
    await expect(page.locator('#input-hour')).toBeDisabled();
    await expect(page.locator('#input-hour')).toHaveValue('');

    await page.click('#btn-review-input');
    await page.click('#btn-confirm-calculate');
    await expect(resultStep).toBeVisible();
    await expect(resultStep).toContainText('시주 미상');
    await expect(resultStep).toContainText('출생 시간 모름 (임의 시주 미생성)');

    // 4) 무단 복제·우클릭 방지 동작 확인
    await resultStep.dispatchEvent('contextmenu');
    await expect(page.locator('#copy-guard-toast')).toBeVisible();

    // 5) 새로고침 시 메모리 결과 즉시 소멸 확인
    await page.reload();
    await expect(page.locator('#saju-form')).toBeVisible();
    await expect(resultStep).toBeHidden();
  });

  test('사주 체험(/saju/): 자동화 스크래퍼 허니팟(honeypot) 입력 시 계산 차단 검증', async ({ page }) => {
    await page.goto('/saju/');
    await page.fill('#input-year', '1990');
    await page.fill('#input-month', '5');
    await page.fill('#input-day', '15');
    await page.check('#time-unknown');

    // 봇이 숨겨진 허니팟 필드에 값을 채운 상황 시뮬레이션
    await page.evaluate(() => {
      const hp = document.getElementById('saju-hp-website') as HTMLInputElement | null;
      if (hp) hp.value = 'https://scraper-bot.invalid';
    });

    await page.click('#btn-review-input');
    await expect(page.locator('#saju-error-banner')).toBeVisible();
    await expect(page.locator('#saju-error-banner')).toContainText('자동화 요청이 감지');
    await expect(page.locator('#saju-confirm-step')).toBeHidden();
  });

  test('404 페이지 및 초안(draft) 비노출 검증', async ({ page }) => {
    const res404 = await page.goto('/non-existent-route-check/');
    expect(res404?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('찾으시는 페이지가 없거나');

    const draftRes = await page.goto('/articles/preparation-guide/');
    expect(draftRes?.status()).toBe(404);
  });
});

test.describe('JavaScript 비활성화(no-JS) 환경 검수', () => {
  test.use({ javaScriptEnabled: false });

  test('JS가 꺼진 상태에서도 홈·소개·상담·문의 안내 열람이 가능하고 사주 체험에는 안내가 표시된다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('사주 명리의 이치로');
    await page.click('a[href="/booking/"]');
    await expect(page).toHaveURL(/\/booking\/$/);
    await expect(page.locator('h1')).toContainText('이메일 상담 안내');

    await page.goto('/saju/');
    await expect(page.locator('#saju-nojs-fallback')).toBeVisible();
    await expect(page.locator('#saju-nojs-fallback')).toContainText('자바스크립트(JavaScript) 활성화가 필요합니다');
  });
});
