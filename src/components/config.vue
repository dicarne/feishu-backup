<script lang="ts" setup>
import { NButton, NSpace, NInput } from 'naive-ui'
import { ref } from 'vue';

const appid = ref("")
const appsecret = ref("")

const redirect_url = ref("")
const backup_url = ref("")

const localmode = import.meta.env.VITE_LOCAL_MODE === "true"

const calculate = () => {
    if (appid.value === "" || appsecret.value === "") {
        redirect_url.value = "请填写ID和Secret"
    } else {
        if (localmode) {
            redirect_url.value = `${import.meta.env.VITE_URL}/#/backup/${appid.value}/${appsecret.value}`
        } else {
            redirect_url.value = `${import.meta.env.VITE_DOMAIN}${import.meta.env.VITE_BASEURL}/#/backup/${appid.value}/${appsecret.value}`
        }
        backup_url.value = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirect_url.value)}&app_id=${appid.value}`
        window.localStorage.setItem("redirect-url", backup_url.value)
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
                <span>备份URL</span><span v-if="localmode">（无需手动保存）</span>
                <n-input :value="backup_url" type="textarea" placeholder="生成后点击此链接后授权即可使用备份功能" />
                <n-space justify="space-around">
                    <n-button v-if="localmode" @click="onComplete" :disabled="backup_url === ''">完成</n-button>
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