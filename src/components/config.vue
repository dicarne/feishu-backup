<script lang="ts" setup>
import { NButton, NSpace, NInput } from 'naive-ui'
import { onMounted, ref } from 'vue';
import { testLocalServer } from './api';

const appid = ref("")
const appsecret = ref("")

const redirect_url = ref("")
const backup_url = ref("")

let localmode = false

onMounted(async () => {
    if (await testLocalServer()) {
        localmode = true
    }
})

const calculate = () => {
    if (appid.value === "" || appsecret.value === "") {
        redirect_url.value = "请填写ID和Secret"
    } else {
        if (localmode) {
            let server = import.meta.env.VITE_SERVER;
            if (server === "") {
                server = window.location.origin
            }
            redirect_url.value = `${server}${import.meta.env.VITE_SERVER_BASEURL}#/backup/${appid.value}/${appsecret.value}`
            backup_url.value = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirect_url.value)}&app_id=${appid.value}`
            window.localStorage.setItem("redirect-url.local", backup_url.value)
        } else {
            let server = import.meta.env.VITE_DOMAIN;
            if (server === "") {
                server = window.location.origin
            }
            redirect_url.value = `${server}${import.meta.env.VITE_PAGE_BASEURL}#/backup/${appid.value}/${appsecret.value}`
            backup_url.value = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirect_url.value)}&app_id=${appid.value}`
            window.localStorage.setItem("redirect-url.public", backup_url.value)
        }

    }
}

const onComplete = () => {
    window.location.replace(backup_url.value)
}

</script>
<template>
    <div class="main-stage">
        <div :style="{
            padding: '10px'
        }">
            <n-space vertical>
                <n-input v-model:value="appid" type="text" placeholder="APP ID" />
                <n-input v-model:value="appsecret" type="text" placeholder="APP Secret" />
                <n-space justify="space-around">
                    <n-button @click="calculate">计算</n-button>
                </n-space>
                <span>重定向URL</span>
                <n-input :value="redirect_url" type="textarea" placeholder="生成后将此链接填到 飞书开放平台-对应应用的开发者后台-安全设置=重定向URL 中" />
                <span>备份URL</span>
                <n-input :value="backup_url" type="textarea" placeholder="生成后点击此链接后授权即可使用备份功能" />
                <n-space justify="space-around">
                    <n-button @click="onComplete" :disabled="backup_url === ''">完成</n-button>
                </n-space>
            </n-space>
        </div>
    </div>
</template>

<style>
.main-stage {
    max-width: 800px;
    max-height: 1000px;
    min-height: 600px;
    min-width: 500px;
    background-color: rgb(255, 255, 255);
    border-radius: 20px;

    padding: 20px;
    padding-top: 40px;
}
</style>