import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
const routes = [
    { path: '/', component: () => import('./App.vue') },
    { path: '/backup/:app_id/:app_secret', component: () => import('./components/backup.vue') },
    { path: '/config', component: () => import('./components/config.vue') }
]

const router = createRouter({
    // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
    history: createWebHashHistory('/tool/feishu-backup/'),
    routes, // `routes: routes` 的缩写
})

createApp(App).use(router).mount('#app')
