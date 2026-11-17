import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /api 로 시작하는 요청은 스프링부트(8080)로 전달 → CORS 설정 불필요
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
