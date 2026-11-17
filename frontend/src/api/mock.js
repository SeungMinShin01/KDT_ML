/**
 * 백엔드 없이 화면을 만들기 위한 가짜 API (.env 의 VITE_USE_MOCK=true 일 때만 사용)
 * 응답 형식은 API 명세서와 같다.
 */
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

const FAKE_DONGS = ['가동', '나동', '다동', '라동', '마동']

// 지도 파일의 시군구 이름을 그대로 학습 데이터 목록으로 사용
export async function getRegions() {
  const geo = await fetch('/geo/sigungu.geo.json').then((r) => r.json())
  const regions = {}
  for (const f of geo.features) {
    const { sido, name } = f.properties
    ;(regions[sido] ||= []).push(name)
  }
  return { regions }
}

export async function getOptions(sido, sigungu) {
  await sleep(200)
  return {
    sido,
    sigungu,
    dongs: FAKE_DONGS.map((d) => `${sigungu.slice(0, 2)}${d}`),
    areaRange: [10.0, 273.9],
    floorRange: [1, 69],
    model: sido,
  }
}

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
