import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//import { proxy } from './secret'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3800,
    //proxy: proxy
  },
  base: "/tool/feishu-backup/",
  plugins: [vue()]
})
