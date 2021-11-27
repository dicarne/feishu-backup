import { createApp } from 'vue'
import App from './App.vue'
import backup from './components/backup.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    { path: '/', component: () => App },
    { path: '/backup/:app_id/:app_secret', component: backup }
]

const router = createRouter({
    // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
    history: createWebHashHistory('/tool/feishu-backup/'),
    routes, // `routes: routes` 的缩写
})

createApp({}).use(router).mount('#app')
