import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  console.log(env.VITE_BASEURL)
  return defineConfig({
    server: {
      port: 3800,
      //proxy: proxy
    },
    base: env.VITE_BASEURL,
    plugins: [vue()]
  })

}
