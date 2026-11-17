import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api 요청을 Spring Boot(8080)로 넘긴다 → 브라우저 입장에선 같은 출처라 CORS 걱정 없음
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
