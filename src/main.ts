import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
const routes = [
    { path: '/', component: () => import('./components/check.vue') },
    { path: '/backup/:app_id/:app_secret', component: () => import('./components/backup.vue') },
    { path: '/config', component: () => import('./components/config.vue') }
]

const router = createRouter({
    history: createWebHashHistory('/tool/feishu-backup/'),
    routes,
})

createApp(App).use(router).mount('#app')
