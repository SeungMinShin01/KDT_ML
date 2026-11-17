/** 985000000 → "9억 8,500만 원" */
export function formatKRW(won) {
  if (won == null || Number.isNaN(won)) return '-'
  const n = Math.round(won / 10000) // 만원 단위
  const eok = Math.floor(n / 10000)
  const man = n % 10000
  if (eok === 0) return `${man.toLocaleString()}만 원`
  if (man === 0) return `${eok}억 원`
  return `${eok}억 ${man.toLocaleString()}만 원`
}

export const clamp = (v, [min, max]) => Math.min(Math.max(v, min), max)
