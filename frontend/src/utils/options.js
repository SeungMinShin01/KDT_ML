/**
 * 입력 옵션 파일(public/data/options.json) → 화면에서 쓰는 모양으로 바꾸기
 * 파일 형식 :
 * {
 *   "regions": { "경기도": { "가평군": ["가평읍 경반리", ...], ... }, ... },  ← 시도 → 시군구 → 동 이름
 *   "ranges":  { "경기도": { "area": [최소, 최대], "floor": [최소, 최대] }, ... }  ← 시도별 입력 범위
 * }
 */

/** 지역 목록 : { "서울특별시": ["강남구", "강동구", ...], ... } */
export function buildRegions(data) {
  const regions = {}
  for (const [sido, sigungus] of Object.entries(data.regions ?? {})) {
    regions[sido] = Object.keys(sigungus)
  }
  return regions
}

/**
 * 시군구 옵션 : { sido, sigungu, dongs, areaRange: [최소, 최대], floorRange: [최소, 최대], model }
 * dongs : 도시는 "청운동", 농촌은 "가평읍 경반리" (예측 요청 때 Spring 이 다시 읍면/동으로 나눔)
 * 범위는 시도 단위 (ranges[시도])
 */
export function buildOptions(data, sido, sigungu) {
  const dongs = data.regions?.[sido]?.[sigungu] ?? []
  const range = data.ranges?.[sido]
  return {
    sido,
    sigungu,
    dongs,
    areaRange: dongs.length && range ? range.area : [],
    floorRange: dongs.length && range ? range.floor : [],
    model: 'LightGBM',
  }
}
