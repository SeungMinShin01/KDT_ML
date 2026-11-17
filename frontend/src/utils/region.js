/**
 * 지도(GeoJSON) 시군구 이름과 학습 데이터(public/data/options.json) 시군구 이름 맞추기
 *  - 지도(2018 경계): "성남시분당구", "부천시", "강남구"
 *  - 공시가격 데이터:  "성남분당구",  "부천원미구"/"부천소사구"/"부천오정구", "강남구"
 */
const compact = (s) => (s || "").replace(/\s+/g, "");

/** "성남시분당구" → "성남분당구" (시 + 구 형태에서 가운데 '시' 제거) */
export const normalize = (s) => compact(s).replace(/시(?=\S+구$)/, "");

/** 지도 시군구 이름 → 학습 데이터의 시군구 이름 후보 배열 */
export function matchSigungu(geoName, dataSigunguList = []) {
  const g = normalize(geoName);
  const exact = dataSigunguList.filter((s) => normalize(s) === g);
  if (exact.length) return exact;

  // 지도엔 "부천시" 하나인데 데이터엔 "부천원미구" 처럼 구로 나뉜 경우
  if (g.endsWith("시")) {
    const base = g.slice(0, -1);
    return dataSigunguList.filter((s) => {
      const n = normalize(s);
      return n.startsWith(base) && n.endsWith("구");
    });
  }
  return [];
}
