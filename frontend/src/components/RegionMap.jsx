import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";

const NATION_CENTER = [36.3, 127.8]; // 대한민국 전체
const NATION_ZOOM = 7;

// 배경 지도: CARTO 키가 있으면 CARTO, 없으면 OpenStreetMap(키 불필요)
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY;
const TILE = CARTO_KEY
  ? {
      url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    }
  : {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };

/** bounds 가 바뀔 때마다 지도를 그 영역으로 이동/확대 (null 이면 전국) */
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { padding: [20, 20], duration: 0.8 });
    else map.flyTo(NATION_CENTER, NATION_ZOOM, { duration: 0.8 });
  }, [bounds, map]);
  return null;
}

export default function RegionMap({
  selectedSido,
  onSelectSido,
  selectedSigungu,
  onSelectSigungu,
  isSidoAvailable,
  isAvailable,
}) {
  const [sidoGeo, setSidoGeo] = useState(null);
  const [sigunguGeo, setSigunguGeo] = useState(null);

  useEffect(() => {
    fetch("/geo/sido.geo.json")
      .then((r) => r.json())
      .then(setSidoGeo);
    fetch("/geo/sigungu.geo.json")
      .then((r) => r.json())
      .then(setSigunguGeo);
  }, []);

  const sigunguOfSido = useMemo(() => {
    if (!sigunguGeo || !selectedSido) return null;
    return {
      type: "FeatureCollection",
      features: sigunguGeo.features.filter(
        (f) => f.properties.sido === selectedSido,
      ),
    };
  }, [sigunguGeo, selectedSido]);

  const bounds = useMemo(() => {
    if (!sidoGeo || !selectedSido) return null;
    const f = sidoGeo.features.find((x) => x.properties.name === selectedSido);
    return f ? L.geoJSON(f).getBounds() : null;
  }, [sidoGeo, selectedSido]);

  // ---------- 시도 레이어 (전국 화면) ----------
  const sidoStyle = (feature) => {
    const ok = isSidoAvailable(feature.properties.name);
    return {
      color: ok ? "#3056d3" : "#9aa1ad",
      weight: ok ? 2 : 1,
      fillColor: ok ? "#3056d3" : "#9aa1ad",
      fillOpacity: ok ? 0.25 : 0.12,
    };
  };
  const onEachSido = (feature, layer) => {
    const name = feature.properties.name;
    const ok = isSidoAvailable(name);
    layer.bindTooltip(ok ? name : `${name} (준비 중)`, { sticky: true });
    if (!ok) return;
    layer.on({
      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.45 }),
      mouseout: (e) => e.target.setStyle({ fillOpacity: 0.25 }),
      click: () => onSelectSido(name),
    });
  };

  // ---------- 시군구 레이어 (시도 확대 화면) ----------
  const sigunguStyle = (feature) => {
    const { sido, name } = feature.properties;
    const available = isAvailable(sido, name);
    const selected = name === selectedSigungu;
    return {
      color: selected ? "#d32f2f" : "#3056d3",
      weight: selected ? 3 : 1,
      fillColor: !available ? "#999" : selected ? "#d32f2f" : "#3056d3",
      fillOpacity: !available ? 0.25 : selected ? 0.45 : 0.12,
    };
  };
  const onEachSigungu = (feature, layer) => {
    const { sido, name } = feature.properties;
    const available = isAvailable(sido, name);
    layer.bindTooltip(available ? name : `${name} (데이터 없음)`, {
      sticky: true,
    });
    if (!available) return;
    layer.on({
      mouseover: (e) => {
        if (name !== selectedSigungu) e.target.setStyle({ fillOpacity: 0.3 });
      },
      mouseout: (e) => {
        if (name !== selectedSigungu) e.target.setStyle({ fillOpacity: 0.12 });
      },
      click: () => onSelectSigungu(name),
    });
  };

  return (
    <div className="map-wrap">
      {selectedSido && (
        <button className="back-btn" onClick={() => onSelectSido(null)}>
          ← 전국 지도
        </button>
      )}
      <div className="map-title">
        {selectedSido
          ? `${selectedSido} — 시군구를 선택하세요`
          : "시도를 선택하세요 (서울·경기)"}
      </div>

      <MapContainer
        center={NATION_CENTER}
        zoom={NATION_ZOOM}
        className="map"
        zoomControl
      >
        <TileLayer url={TILE.url} attribution={TILE.attribution} />
        <FitBounds bounds={bounds} />

        {!selectedSido && sidoGeo && (
          <GeoJSON
            key={`sido-${isSidoAvailable("서울특별시")}`}
            data={sidoGeo}
            style={sidoStyle}
            onEachFeature={onEachSido}
          />
        )}

        {sigunguOfSido && (
          <GeoJSON
            key={`${selectedSido}-${selectedSigungu}`}
            data={sigunguOfSido}
            style={sigunguStyle}
            onEachFeature={onEachSigungu}
          />
        )}
      </MapContainer>
    </div>
  );
}
