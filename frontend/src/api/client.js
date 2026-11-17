import axios from 'axios'
import * as mock from './mock'
import { buildOptions, buildRegions } from '../utils/options'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// vite.config.js 의 proxy 가 /api → http://localhost:8080 으로 넘겨준다
const api = axios.create({ baseURL: '/api', timeout: 10000 })

/**
 * 3-0. 입력 옵션 파일 (public/data/options.json , 정적 파일이라 백엔드 없이 바로 읽음)
 * { regions: 시도 → 시군구 → 동 이름 , ranges: 시도별 면적·층 범위 }
 * 처음 한 번만 받아 두고 다시 쓴다. 실패하면 다음 호출 때 다시 시도.
 */
let optionData = null
function loadOptionData() {
  if (!optionData) {
    optionData = axios
      .get('/data/options.json')
      .then(({ data }) => data)
      .catch((err) => {
        optionData = null
        throw err
      })
  }
  return optionData
}

/** 3-1. 시도 → 시군구 목록 : { regions: { "서울특별시": ["강남구", ...], ... } } */
export async function getRegions() {
  return { regions: buildRegions(await loadOptionData()) }
}

/** 3-2. 법정동 목록 + 입력 범위 */
export async function getOptions(sido, sigungu) {
  return buildOptions(await loadOptionData(), sido, sigungu)
}

/**
 * 3-3. 예측 (SSE)
 * EventSource 는 GET 만 되므로 axios POST + onDownloadProgress 로 스트림을 읽는다.
 * @param req      { sido, sigungu, dong, area, floor }
 * @param onEvent  이벤트 하나 도착할 때마다 호출: ({ step, message, ... }) => void
 * @param signal   AbortController.signal (새 요청 시 이전 요청 취소용)
 */
export async function streamPredict(req, onEvent, signal) {
  if (USE_MOCK) return mock.streamPredict(req, onEvent, signal)

  let seen = 0 // 지금까지 처리한 responseText 길이
  let buffer = '' // 아직 \n\n 이 안 온 미완성 조각

  const handleText = (fullText) => {
    buffer += fullText.slice(seen)
    seen = fullText.length
    const parts = buffer.split('\n\n')
    buffer = parts.pop() // 마지막 조각은 미완성일 수 있으니 남겨둔다
    for (const block of parts) {
      const dataLines = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
      if (!dataLines.length) continue
      try {
        onEvent(JSON.parse(dataLines.join('\n')))
      } catch {
        // JSON 이 아닌 이벤트는 무시
      }
    }
  }

  try {
    const res = await api.post('/predict', req, {
      responseType: 'text',
      timeout: 0, // 스트림은 시간 제한 없음 (서버/WebClient 타임아웃에 맡김)
      headers: { Accept: 'text/event-stream' },
      signal,
      onDownloadProgress: (e) => {
        const xhr = e.event?.target
        if (xhr?.responseText != null) handleText(xhr.responseText)
      },
    })
    // 마지막 이벤트가 progress 이벤트 없이 끝난 경우 대비
    if (typeof res.data === 'string') handleText(res.data + '\n\n')
  } catch (err) {
    if (axios.isCancel(err)) return
    // 400 VALIDATION_ERROR / 503 등 일반 JSON 에러
    let body = err.response?.data
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { /* ignore */ }
    }
    onEvent({
      step: 'error',
      code: body?.code || 'NETWORK_ERROR',
      message: body?.message || '서버에 연결할 수 없습니다',
    })
  }
}
