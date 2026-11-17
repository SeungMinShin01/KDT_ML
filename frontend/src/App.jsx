import { useCallback, useEffect, useRef, useState } from "react";
import RegionMap from "./components/RegionMap";
import PredictPanel from "./components/PredictPanel";
import { getOptions, getRegions, streamPredict } from "./api/client";
import { matchSigungu } from "./utils/region";
import { clamp } from "./utils/format";

const DEFAULT_AREA = 84.9;
const DEFAULT_FLOOR = 10;
const EMPTY_FORM = {
  sigungu: "",
  dong: "",
  area: DEFAULT_AREA,
  floor: DEFAULT_FLOOR,
};

export default function App() {
  const [regions, setRegions] = useState(null); // { "서울특별시": ["강남구", ...] }
  const [sido, setSido] = useState(null);
  const [geoSigungu, setGeoSigungu] = useState(null); // 지도에서 클릭한 이름 (예: 성남시분당구)
  const [candidates, setCandidates] = useState([]); // 학습 데이터의 시군구 이름 후보

  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // 화면 진입 시 학습 데이터에 있는 지역 목록
  useEffect(() => {
    getRegions()
      .then((d) => setRegions(d.regions))
      .catch(() =>
        setError("지역 목록을 불러오지 못했습니다 (백엔드 실행 여부 확인)"),
      );
  }, []);

  // 학습한 시도인지 (regions 로드 전에는 서울·경기만 열어 둔다)
  const isSidoAvailable = useCallback(
    (s) => (regions ? s in regions : ["서울특별시", "경기도"].includes(s)),
    [regions],
  );

  const isAvailable = useCallback(
    (s, geoName) =>
      !regions || matchSigungu(geoName, regions[s] ?? []).length > 0,
    [regions],
  );

  // ---------- 예측 (SSE) ----------
  const runPredict = useCallback(
    (f) => {
      abortRef.current?.abort(); // 이전 요청 취소
      const controller = new AbortController();
      abortRef.current = controller;

      setLogs([]);
      setResult(null);
      setError(null);
      setRunning(true);

      const req = {
        sido,
        sigungu: f.sigungu,
        dong: f.dong,
        area: Number(f.area),
        floor: Number(f.floor),
      };

      streamPredict(
        req,
        (ev) => {
          if (controller.signal.aborted) return;
          if (ev.step === "done") {
            setResult(ev);
            setRunning(false);
          } else if (ev.step === "error") {
            setLogs((prev) => [...prev, ev]);
            setError(ev.message);
            setRunning(false);
          } else {
            setLogs((prev) => [...prev, ev]);
          }
        },
        controller.signal,
      ).finally(() => {
        if (!controller.signal.aborted) setRunning(false);
      });
    },
    [sido],
  );

  // ---------- 시군구가 정해지면 법정동 목록 로드 → 기본값으로 바로 예측 ----------
  useEffect(() => {
    if (!sido || !form.sigungu) return;
    let ignore = false;
    setLoadingOptions(true);
    getOptions(sido, form.sigungu)
      .then((opt) => {
        if (ignore) return;
        setOptions(opt);
        const next = {
          sigungu: form.sigungu,
          dong: opt.dongs?.[0] ?? "",
          area: clamp(DEFAULT_AREA, opt.areaRange),
          floor: clamp(DEFAULT_FLOOR, opt.floorRange),
        };
        setForm(next);
        if (next.dong) runPredict(next); // 클릭 한 번에 결과가 보이도록
      })
      .catch(() => !ignore && setError("법정동 목록을 불러오지 못했습니다"))
      .finally(() => !ignore && setLoadingOptions(false));
    return () => {
      ignore = true;
    };
    // form.sigungu 가 바뀔 때만 (법정동/면적/층 변경으로는 다시 불러오지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sido, form.sigungu]);

  // ---------- 지도 이벤트 ----------
  const resetSelection = () => {
    abortRef.current?.abort();
    setGeoSigungu(null);
    setCandidates([]);
    setOptions(null);
    setForm(EMPTY_FORM);
    setLogs([]);
    setResult(null);
    setError(null);
    setRunning(false);
  };

  const handleSelectSido = (name) => {
    resetSelection();
    setSido(name);
  };

  const handleSelectSigungu = (geoName) => {
    resetSelection();
    const list = matchSigungu(geoName, regions?.[sido] ?? [geoName]);
    setGeoSigungu(geoName);
    setCandidates(list);
    if (list.length) setForm({ ...EMPTY_FORM, sigungu: list[0] });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 공동주택 공시가격 예측</h1>
        <span className="muted">LightGBM · 서울특별시 / 경기도</span>
      </header>
      <main className="layout">
        <RegionMap
          selectedSido={sido}
          onSelectSido={handleSelectSido}
          selectedSigungu={geoSigungu}
          onSelectSigungu={handleSelectSigungu}
          isSidoAvailable={isSidoAvailable}
          isAvailable={isAvailable}
        />
        <PredictPanel
          sido={sido}
          geoSigungu={geoSigungu}
          sigunguCandidates={candidates}
          form={form}
          setForm={setForm}
          options={options}
          loadingOptions={loadingOptions}
          logs={logs}
          running={running}
          result={result}
          error={error}
          onPredict={() => runPredict(form)}
        />
      </main>
    </div>
  );
}
