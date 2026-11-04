if (process.env.CONFIRM_PRODUCTION_DEPLOY !== 'true') {
  console.error(
    '[DEPLOY GUARD] 운영(production) 배포는 대표 정보·상담 이메일·계산 기준 확정 및 사용자 공개 요청 후 CONFIRM_PRODUCTION_DEPLOY=true 설정 시에만 실행됩니다. 미리보기 배포는 npm run deploy:preview를 사용하세요.',
  );
  process.exit(1);
}
console.log('[DEPLOY GUARD] 운영 배포 승인 플래그 확인 완료. 대상 리소스: hakso-production');
