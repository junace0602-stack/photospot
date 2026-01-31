import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 수동 청킹으로 번들 크기 최적화
        manualChunks: {
          // React 코어
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // 아이콘 (lucide-react는 tree-shaking 됨)
          'icons': ['lucide-react'],
          // Google Maps 관련
          'maps': ['@googlemaps/markerclusterer'],
          // EXIF 추출
          'exif': ['exifr'],
          // HEIC 변환 (매우 큰 라이브러리 - 필요할 때만 로드)
          'heic': ['heic2any'],
        },
      },
    },
    // 청크 크기 경고 임계값 조정
    chunkSizeWarningLimit: 600,
  },
})
