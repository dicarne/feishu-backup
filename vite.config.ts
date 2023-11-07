import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  let url = env.VITE_PAGE_BASEURL ? env.VITE_PAGE_BASEURL : env.VITE_SERVER_BASEURL
  return defineConfig({
    server: {
      port: 3800,
      //proxy: proxy
    },
    base: url,
    plugins: [vue()]
  })

}
