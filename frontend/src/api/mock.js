/**
 * 백엔드 없이 화면을 만들기 위한 가짜 예측 API (.env 의 VITE_USE_MOCK=true 일 때만 사용)
 * 지역·옵션 목록은 public/data/options.json 정적 파일을 읽으므로 가짜가 필요 없다.
 */
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

export async function streamPredict(req, onEvent, signal) {
  try {
    onEvent({ step: 'validate', message: '입력값 검증 중' })
    await sleep(600, signal)
    onEvent({ step: 'model', message: `${req.sido} 전용 모델 선택`, model: req.sido })
    await sleep(600, signal)
    onEvent({ step: 'predict', message: 'LightGBM 추론 중' })
    await sleep(700, signal)
    const perM2 = (req.sido === '서울특별시' ? 14_000_000 : 7_500_000) * (1 + req.floor / 200)
    onEvent({
      step: 'done',
      prediction: Math.round(perM2 * req.area),
      pricePerM2: Math.round(perM2),
      r2: req.sido === '서울특별시' ? 0.94 : 0.93,
      model: req.sido,
    })
  } catch {
    // 취소됨
  }
}
