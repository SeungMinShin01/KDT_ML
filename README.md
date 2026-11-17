# 실시간 머신러닝 예측 웹 서비스

LightGBM으로 학습한 모델을 FastAPI 서버에 올리고,
Spring Boot가 중간에서 결과를 받아 React 화면에 **실시간(SSE)** 으로 보여주는 프로젝트입니다.

---

## 1. 전체 흐름

```
[React 화면]  ⇄  [Spring Boot 서버]  ⇄  [FastAPI 서버]
  (axios)          (WebClient)          (LightGBM 모델)
  포트 5173        포트 8080             포트 8000
```

1. 사용자가 React 화면에서 값을 입력하고 **예측하기** 버튼을 누름
2. React → Spring Boot 로 요청 전송 (axios)
3. Spring Boot → FastAPI 로 요청 전달 (WebClient, 논블로킹)
4. FastAPI 가 저장된 모델로 예측하면서 진행 상황을 실시간으로 보냄 (SSE)
5. Spring Boot 가 받은 내용을 그대로 React 로 다시 전달 (SSE 중계)
6. React 화면에 **진행 메시지 → 예측 결과 → 모델 성능 점수** 순서로 표시

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
| `ai-server/` | FastAPI + 모델 (파이썬 담당, `main.py` 만 만들어진 상태) |

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

## 5. 서버끼리 주고받는 데이터 약속 (SSE)

FastAPI 와 Spring Boot, React 가 **같은 이름**을 쓰도록 맞춰야 합니다.

| 이벤트 이름 | 언제 보내나 | 데이터 예시 |
|---|---|---|
| `progress` | 처리 중간중간 | `{"message": "추론 완료"}` |
| `result` | 마지막 결과 | `{"prediction": 123.4, "metrics": {"r2": 0.91}}` |
| `error` | 오류가 났을 때 | `{"message": "AI 서버 통신 실패"}` |

- 회귀 문제면 성능 점수는 `r2` (결정계수)
- 분류 문제면 성능 점수는 `f1` (F1-Score)

---

## 6. 필수 요구사항 체크리스트

- [ ] 데이터셋 2,000행 이상 확보 (Kaggle, AI 허브, 공공데이터포털 등)
- [ ] 회귀 / 분류 중 문제 유형 정하고 타겟 변수 결정
- [ ] LightGBM 모델 사용 (`LGBMRegressor` 또는 `LGBMClassifier`)
- [ ] Optuna 로 하이퍼파라미터 튜닝 → `study.best_params` 로 최종 학습
- [ ] 학습된 모델과 성능 점수를 joblib 으로 `.pkl` 파일 저장
- [ ] FastAPI 시작할 때 `.pkl` 을 한 번만 불러오기 (매번 재학습 X)
- [ ] FastAPI 응답에 **예측 결과 + 성능 점수(R2 또는 F1)** 포함
- [ ] Spring Boot 에서 WebClient 로 FastAPI 호출 (논블로킹)
- [ ] Spring Boot 에서 SSE 로 React 에 실시간 중계
- [ ] React 에서 axios 로 요청 보내고 스트리밍 응답 받기
- [ ] 진행 메시지, 예측 결과, 성능 점수를 화면에 표시

---

## 7. 할 일

- [ ] 주제와 데이터셋 정하기
- [ ] 입력값(피처) 이름 정하기 → FastAPI / Spring Boot / React 세 곳 모두 같은 이름으로
- [ ] 발표 자료 준비
