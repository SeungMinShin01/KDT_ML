# 공시가격 예측 프론트엔드 (React + Vite)

지도(서울·경기)에서 시도 → 시군구를 고르면 우측 패널에서 법정동·면적·층을 입력하고,
Spring Boot(`/api/predict`)의 SSE 스트림으로 진행 상태와 예측 결과(R²)를 보여줍니다.

## 실행
```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```
- `.env` 의 `VITE_USE_MOCK=true` → 백엔드 없이 가짜 데이터로 화면 확인
- 백엔드 연결 시 `VITE_USE_MOCK=false` 로 바꾸고 재시작. `/api` 는 vite proxy 로 `localhost:8080` 에 전달됩니다.

## 구조
```
public/geo/sido.geo.json        서울·경기 시도 경계 (단순화)
public/geo/sigungu.geo.json     서울·경기 시군구 경계 67개 (통계청 2018 경계, southkorea-maps)
src/api/client.js               axios: getRegions / getOptions / streamPredict(SSE 파싱)
src/api/mock.js                 백엔드 없을 때 쓰는 가짜 API
src/components/RegionMap.jsx    react-leaflet 지도 (시도 클릭 → 확대 → 시군구 클릭)
src/components/PredictPanel.jsx 우측 입력 폼 + 진행 로그 + 결과 카드
src/utils/region.js             지도 이름 ↔ 학습 데이터 이름 매칭 ("성남시분당구" ↔ "성남시 분당구")
src/App.jsx                     상태 관리, 시군구 선택 시 옵션 로드 → 기본값으로 자동 예측
```

## 지역 이름 매칭
지도 경계는 2018년 기준이라 이후 생긴 구(예: 부천시 원미구·소사구·오정구)는 지도에 `부천시` 하나로 나옵니다.
이 경우 학습 데이터의 후보가 여러 개가 되고, 우측 패널에 **구 선택** 드롭다운이 자동으로 나타납니다.
학습 데이터에 없는 시군구는 지도에서 회색으로 표시되고 클릭되지 않습니다.
