# 실시간 머신러닝 예측 웹 서비스 — 전국 주택 공시가격 예측

국토교통부 **주택 공시가격(2026)** 데이터로 LightGBM 모델을 학습해 FastAPI 서버에 올리고,
Spring Boot가 중간에서 결과를 받아 React 화면에 **실시간(SSE)** 으로 보여주는 프로젝트입니다.

- **문제 유형**: 회귀 (타깃: 공시가격, 원)
- **입력값**: 시도 / 시군구 / 읍면 / 동·리 / 전용면적(㎡) / 층
- **성능 지표**: R2 (결정계수)
- **데이터 범위**: 전국 (원본에서 시도별로 고르게 무작위 추출)

---

## 1. 전체 흐름

```
[React 화면]  ⇄  [Spring Boot 서버]  ⇄  [FastAPI 서버]
  (axios)          (WebClient)          (LightGBM 모델)
  포트 5173        포트 8080             포트 8000
```

### Chapter 0. 모델 학습 (사전에 1회, 파이썬 단독)
`train.py` 로 CSV 전처리 → Optuna + LightGBM 학습 → `model.pkl`, `metrics.pkl` 저장
→ 입력 옵션 파일 `options.json` 도 함께 만들어 React 의 `frontend/public/data/` 에 넣음

### Chapter 1. 입력 옵션 조회 (지도·드롭다운) — 서버를 거치지 않음
1. React 가 정적 파일 `/data/options.json` 을 처음 한 번 읽어 둠 (axios GET)
2. 지역 목록 / 시군구 옵션을 React 안에서 바로 계산 (`frontend/src/utils/options.js`)
3. 지도·드롭다운과 입력 범위를 채움

### Chapter 2. 예측 (SSE 스트리밍)
1. 사용자가 지역·면적·층을 입력하고 **예측하기** 버튼을 누름
2. React → Spring Boot 로 요청 전송 (axios)
3. Spring Boot → FastAPI 로 요청 전달 (WebClient, 논블로킹)
4. FastAPI 가 저장된 모델로 예측하면서 진행 상황을 실시간으로 보냄 (SSE)
5. Spring Boot 가 받은 내용을 그대로 React 로 다시 전달 (SSE 중계)
6. React 화면에 **진행 메시지 → 예측 공시가격 → 모델 성능 점수(R2)** 순서로 표시

---

## 2. 역할 분담

| 담당 | 맡는 부분 | 사용 기술 |
|---|---|---|
| 파이썬 담당 | 데이터 준비, 모델 학습, 예측 서버 | LightGBM, Optuna, joblib, FastAPI |
| 자바 담당 | 중간 서버 (요청 전달 + 실시간 중계) | Spring Boot, WebFlux, WebClient, SSE |
| 같이 (AI 활용) | 입력 화면, 결과 화면 | React, axios |

> 설계는 같이 하고, 코드는 각자 구현

---

## 3. 폴더 구조

| 폴더 | 내용 |
|---|---|
| `backend/` | Spring Boot 서버 (자바 담당) |
| `frontend/` | React 화면 (Vite) |
| `ai-server/` | FastAPI + 모델 (파이썬 담당) |

### `ai-server/` 파일
| 파일 | 내용 |
|---|---|
| `train.py` | CSV 전처리 → Optuna + LightGBM 학습 → pkl 저장 (사전에 1회 실행) |
| `model.pkl` | 최종 LightGBM 모델 |
| `metrics.pkl` | R2, 동별 면적·층 범위 (예측 시 범위 검사용) |
| `options.json` | 동별 면적·층 범위 목록 → React `frontend/public/data/` 로 복사 |
| `main.py` | 구동 시 pkl 한 번 로드, 예측 엔드포인트(`POST /predict/stream`) 제공 |
---

## 4. 개발 환경 (이 컴퓨터 기준)

| 항목 | 버전 |
|---|---|
| Python | 3.15 |
| Java | 21 |
| Node.js | 24 |

### Python 3.15 사용 시 주의
- `uvicorn[standard]` 는 3.15 에서 설치 충돌이 나므로 **`uvicorn` (기본판)** 으로 설치
- `optuna` 는 일부 의존 패키지를 직접 빌드하므로 설치가 조금 오래 걸릴 수 있음

### 필요한 파이썬 패키지
```
fastapi
uvicorn
pydantic
lightgbm
optuna
scikit-learn
pandas
numpy
joblib
```

---

## 5. 서버끼리 주고받는 데이터 약속

FastAPI / Spring Boot / React 가 **같은 이름**을 쓰도록 맞춥니다.
JSON 키와 쿼리 파라미터는 **영문 camelCase** 이고, 한글 컬럼명과의 매핑은 **파이썬 쪽에서만** 처리합니다.

### 5-1. 이름과 단위

| 이름 | 타입 | 데이터 컬럼 | 설명 |
|---|---|---|---|
| `sido` | string | 시도 | 예: `서울특별시`, `경기도` |
| `sigungu` | string | 시군구 | 예: `종로구`, `수원시 장안구`, `양평군` |
| `eupmyeon` | string | 읍면 | 예: `양평읍`. 도시 지역처럼 없으면 빈 문자열 `""` |
| `dong` | string | 동리 | 도시는 동, 농촌은 리. 예: `청운동`, `양근리` |
| `area` | number | 전용면적 | **㎡ 단위**, 소수 둘째 자리 (화면에서 평으로 받으면 React 가 ㎡ 로 변환, 1평 = 3.3058㎡) |
| `floor` | integer | 호명에서 추출 | 지하는 음수 (지하 1층 = `-1`) |
| `price` | integer | 공시가격 | **원 단위** (Java 에서는 `Long`) |
| `priceText` | string | - | 화면 표시용 (예: `4억 2,900만 원`) |
| `r2` | number | - | 테스트 세트 결정계수, 소수 넷째 자리 |

#### 층 추출 규칙 (파이썬, 학습·예측 동일 적용)
| 호명 예시 | 층 |
|---|---|
| `111`, `1203` | `호명 // 100` → `1`, `12` |
| `402호` | 숫자만 남기고 위 규칙 → `4` |
| `1층101` | `층` 앞 숫자 → `1` |
| `B01`, `비01`, `지층1` | `-1` |
| `A세대`, `A호` 등 판단 불가 | 학습 데이터에서 제외 |

### 5-2. Chapter 1 — 입력 옵션 조회 (정적 JSON 파일, 서버를 거치지 않음)

**옵션 파일 `options.json` (파이썬 담당이 `train.py` 에서 만들어 전달)**

- 위치: `frontend/public/data/options.json` (React 가 `/data/options.json` 으로 처음 한 번 읽음)
- 형식: **동 하나당 한 줄인 JSON 배열**, 인코딩 UTF-8

```json
[
  { "sido": "경기도", "sigungu": "양평군", "eupmyeon": "양평읍", "dong": "양근리",
    "areaMin": 39.6, "areaMax": 134.8, "floorMin": -1, "floorMax": 25 },
  { "sido": "서울특별시", "sigungu": "종로구", "eupmyeon": "", "dong": "청운동",
    "areaMin": 39.6, "areaMax": 187.49, "floorMin": -1, "floorMax": 5 }
]
```

파이썬에서 만드는 방법 (학습에 쓴 데이터 `df` 기준, 층 추출 규칙 적용 후):
```python
options = (df.groupby(['시도', '시군구', '읍면', '동리'])
             .agg(areaMin=('전용면적', 'min'), areaMax=('전용면적', 'max'),
                  floorMin=('층', 'min'), floorMax=('층', 'max'))
             .reset_index()
             .rename(columns={'시도': 'sido', '시군구': 'sigungu', '읍면': 'eupmyeon', '동리': 'dong'}))
options.to_json('options.json', orient='records', force_ascii=False, indent=2)
```
- `읍면` 결측은 빈 문자열 `""` 로 채운 뒤 만듭니다.
- 지금 들어 있는 파일은 **샘플 CSV(서울 종로·용산·중구, 114개 동)** 로 만든 임시본이므로, 전국 학습이 끝나면 새 파일로 교체합니다.

**React 안에서 바꾸는 모양 (`frontend/src/utils/options.js`)**

| 함수 | 결과 |
|---|---|
| `getRegions()` → `buildRegions(rows)` | `{"regions": {"서울특별시": ["용산구", "종로구", "중구"], ...}}` |
| `getOptions(sido, sigungu)` → `buildOptions(rows, sido, sigungu)` | 아래 예시 |

```json
{ "sido": "경기도", "sigungu": "양평군",
  "dongs": ["양평읍 양근리", "용문면 다문리"],
  "areaRange": [30.0, 134.8], "floorRange": [-1, 25], "model": "LightGBM" }
```
- 농촌은 `dongs` 에 읍면을 붙인 이름(`양평읍 양근리`)을 넣고, 예측 요청 때 Spring 이 다시 `eupmyeon`, `dong` 으로 나눕니다.
- `areaRange`, `floorRange` 는 시군구 안 모든 동의 [최소, 최대] 입니다.

### 5-3. Chapter 2 — 예측 (SSE)

| 구간 | 요청 | 응답 |
|---|---|---|
| React → Spring Boot | `POST /api/predict` body `{"sido": "경기도", "sigungu": "양평군", "dong": "양평읍 양근리", "area": 84.97, "floor": 3}` | `text/event-stream` |
| Spring Boot → FastAPI | `POST /predict/stream` body `{"sido": "경기도", "sigungu": "양평군", "eupmyeon": "양평읍", "dong": "양근리", "area": 84.97, "floor": 3}` | `text/event-stream` |

- Spring → FastAPI body 는 Spring 이 `dong` 의 읍면을 나눈 뒤 보냅니다. 도시 지역은 `"eupmyeon": ""` 입니다.
- FastAPI 는 결과를 한 번에 돌려주지 않고 **이벤트를 하나씩 스트리밍**합니다 (`StreamingResponse(media_type="text/event-stream")`).
- 이벤트 한 개 형식: `event: progress\ndata: {"step": "received", "message": "..."}\n\n` (`data` 는 한 줄 JSON, 마지막에 빈 줄)
- `result` 이벤트에는 `price` 가 **반드시** 들어가야 합니다. (Spring 이 ㎡당 가격을 계산할 때 사용)

**FastAPI → Spring Boot (파이썬 담당이 보내는 이벤트)**

| 이벤트 이름 | 언제 보내나 | 데이터 예시 |
|---|---|---|
| `progress` | 처리 중간중간 | `{"step": "predict", "message": "모델이 예측하는 중"}` (`step`: `received` → `preprocess` → `predict`) |
| `result` | 마지막 결과 | `{"price": 429000000, "priceText": "4억 2,900만 원", "r2": 0.9123}` |
| `error` | 오류가 났을 때 | `{"code": "OUT_OF_RANGE", "message": "면적이 해당 동의 범위를 벗어났어요"}` |

**Spring Boot → React (프론트가 읽는 형식, 이벤트 이름은 그대로 두고 data 에 `step` 을 붙임)**

| 이벤트 이름 | 데이터 예시 |
|---|---|
| `progress` | `{"step": "predict", "message": "모델이 예측하는 중"}` (그대로) |
| `result` | `{"step": "done", "prediction": 429000000, "priceText": "4억 2,900만 원", "pricePerM2": 5048840, "r2": 0.9123, "model": "LightGBM"}` |
| `error` | `{"step": "error", "code": "OUT_OF_RANGE", "message": "..."}` |

#### 오류 코드
| code | 보내는 쪽 | 상황 |
|---|---|---|
| `INVALID_PARAM` | FastAPI | 필수 값 누락, 숫자가 아님 |
| `UNKNOWN_REGION` | FastAPI | 학습 데이터에 없는 지역 조합 |
| `OUT_OF_RANGE` | FastAPI | 면적·층이 해당 동의 범위를 벗어남 |
| `MODEL_ERROR` | FastAPI | 예측 중 예외 발생 |
| `SERVER_UNAVAILABLE` | Spring Boot | FastAPI 연결 실패·시간 초과 |

### 5-4. Java DTO 이름

| 클래스 | 필드 |
|---|---|
| `PredictDto` | `sido`, `sigungu`, `eupmyeon`, `dong`, `area`(Double), `floor`(Integer) (React 예측 요청 body) |
> 수업 방식대로 Spring MVC(Controller → Service → Dto) + `SseEmitter` 로 구현합니다.
> FastAPI 응답과 React 응답은 `Map<String, Object>` 로 주고받으므로 별도 DTO 를 두지 않습니다. `price` 는 수십억 원이라 `long` 으로 다룹니다.

---

## 6. 필수 요구사항 체크리스트

- [x] 데이터셋 2,000행 이상 확보 — 국토교통부 주택 공시가격(2026), 공공데이터포털
- [x] 회귀 / 분류 중 문제 유형 정하고 타겟 변수 결정 — 회귀, 공시가격
- [ ] LightGBM 모델 사용 (`LGBMRegressor`)
- [ ] Optuna 로 하이퍼파라미터 튜닝 → `study.best_params` 로 최종 학습
- [ ] 학습된 모델과 성능 점수를 joblib 으로 `.pkl` 파일 저장
- [ ] FastAPI 시작할 때 `.pkl` 을 한 번만 불러오기 (매번 재학습 X)
- [ ] FastAPI 응답에 **예측 결과 + 성능 점수(R2)** 포함
- [ ] Spring Boot 에서 WebClient 로 FastAPI 호출 (논블로킹)
- [ ] Spring Boot 에서 SSE 로 React 에 실시간 중계
- [ ] React 에서 axios 로 요청 보내고 스트리밍 응답 받기
- [ ] 진행 메시지, 예측 결과, 성능 점수를 화면에 표시

---

## 7. 할 일

- [x] 주제와 데이터셋 정하기 — 전국 주택 공시가격 예측
- [x] 입력값(피처) 이름 정하기 — 5번 데이터 약속 참고
- [ ] 전국 데이터에서 시도별 무작위 추출 (원본이 법정동코드 순 정렬이라 앞부분만 자르면 서울 일부만 들어감)
- [ ] 발표 자료 준비
