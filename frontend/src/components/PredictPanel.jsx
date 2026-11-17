import { formatKRW } from '../utils/format'

const STEP_LABEL = {
  validate: '입력값 검증',
  model: '모델 선택',
  predict: '추론',
}

/**
 * 우측 패널: 선택 지역 + 입력 폼 + SSE 진행 로그 + 결과
 */
export default function PredictPanel({
  sido,
  geoSigungu,
  sigunguCandidates, // 학습 데이터의 시군구 후보 (보통 1개, 부천시처럼 구가 나뉘면 여러 개)
  form,
  setForm,
  options,
  loadingOptions,
  logs,
  running,
  result,
  error,
  onPredict,
}) {
  if (!geoSigungu) {
    return (
      <aside className="panel panel-empty">
        <h2>공시가격 예측</h2>
        <p>지도에서 시도 → 시군구를 차례로 선택하세요.</p>
        <ol>
          <li>시도 클릭 → 확대</li>
          <li>시군구 클릭 → 기본값(84㎡, 10층)으로 바로 예측</li>
          <li>법정동·면적·층을 바꿔 다시 예측</li>
        </ol>
      </aside>
    )
  }

  if (!sigunguCandidates.length) {
    return (
      <aside className="panel">
        <div className="region">📍 {sido} {geoSigungu}</div>
        <p className="muted">이 지역은 학습 데이터에 없어 예측할 수 없습니다.</p>
      </aside>
    )
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const areaRange = options?.areaRange ?? [10, 300]
  const floorRange = options?.floorRange ?? [1, 70]

  return (
    <aside className="panel">
      <div className="region">📍 {sido} {form.sigungu || geoSigungu}</div>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onPredict()
        }}
      >
        {sigunguCandidates.length > 1 && (
          <label>
            구
            <select value={form.sigungu} onChange={set('sigungu')}>
              {sigunguCandidates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          법정동
          <select value={form.dong} onChange={set('dong')} disabled={loadingOptions}>
            {(options?.dongs ?? []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label>
          <span>
            전용면적 <b>{Number(form.area).toFixed(1)}㎡</b>
            <span className="muted"> (약 {(form.area / 3.3058).toFixed(0)}평)</span>
          </span>
          <input
            type="range"
            min={areaRange[0]}
            max={areaRange[1]}
            step="0.1"
            value={form.area}
            onChange={set('area')}
          />
        </label>

        <label>
          층
          <input
            type="number"
            min={floorRange[0]}
            max={floorRange[1]}
            value={form.floor}
            onChange={set('floor')}
          />
        </label>

        <button type="submit" disabled={running || loadingOptions || !form.dong}>
          {running ? '예측 중…' : '예측하기'}
        </button>
      </form>

      {/* SSE 진행 상태 */}
      {logs.length > 0 && (
        <ul className="logs">
          {logs.map((l, i) => {
            const last = i === logs.length - 1
            const icon = l.step === 'error' ? '✖' : last && running ? '⏳' : '✔'
            return (
              <li key={i} className={l.step === 'error' ? 'err' : ''}>
                {icon} {STEP_LABEL[l.step] ? `[${STEP_LABEL[l.step]}] ` : ''}{l.message}
              </li>
            )
          })}
        </ul>
      )}

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="result">
          <div className="result-label">예상 공시가격</div>
          <div className="result-price">{formatKRW(result.prediction)}</div>
          <div className="result-sub">
            ㎡당 {formatKRW(result.pricePerM2)}
          </div>
          <div className="metrics">
            <span>모델: {result.model}</span>
            <span>
              R² = <b>{Number(result.r2).toFixed(3)}</b>
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
