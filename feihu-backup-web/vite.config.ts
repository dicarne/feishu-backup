import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3800
  },
  base: "/tool/feishu-backup/",
  plugins: [vue()]
})
