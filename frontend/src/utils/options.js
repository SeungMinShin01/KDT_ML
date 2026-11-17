/**
 * 입력 옵션 파일(public/data/options.json) → 화면에서 쓰는 모양으로 바꾸기
 * 파일 한 줄 : { sido, sigungu, eupmyeon, dong, areaMin, areaMax, floorMin, floorMax }
 */

/** 지역 목록 : { "서울특별시": ["용산구", "종로구", ...], ... } */
export function buildRegions(rows) {
  const regions = {}
  for (const r of rows) {
    const list = (regions[r.sido] ||= [])
    if (!list.includes(r.sigungu)) list.push(r.sigungu)
  }
  return regions
}

/**
 * 시군구 옵션 : { sido, sigungu, dongs, areaRange: [최소, 최대], floorRange: [최소, 최대], model }
 * dongs : 도시는 "청운동", 농촌은 "양평읍 양근리" (예측 요청 때 Spring 이 다시 읍면/동으로 나눔)
 */
export function buildOptions(rows, sido, sigungu) {
  const list = rows.filter((r) => r.sido === sido && r.sigungu === sigungu)
  return {
    sido,
    sigungu,
    dongs: list.map((r) => (r.eupmyeon ? `${r.eupmyeon} ${r.dong}` : r.dong)),
    areaRange: list.length
      ? [Math.min(...list.map((r) => r.areaMin)), Math.max(...list.map((r) => r.areaMax))]
      : [],
    floorRange: list.length
      ? [Math.min(...list.map((r) => r.floorMin)), Math.max(...list.map((r) => r.floorMax))]
      : [],
    model: 'LightGBM',
  }
}
