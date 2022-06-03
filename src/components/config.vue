<script lang="ts" setup>
import { NButton, NSpace, NList, NListItem, NThing, NModal, NCard, NCascader, useMessage, useDialog, NInput } from 'naive-ui'
import { ref } from 'vue';
const appid = ref("")
const appsecret = ref("")

const redirect_url = ref("")
const backup_url = ref("")

const calculate = () => {
    if (appid.value === "" || appsecret.value === "") {
        redirect_url.value = "请填写ID和Secret"
    }else {
        redirect_url.value = `https://dicarne.github.io/feishu-backup/#/backup/${appid.value}/${appsecret.value}`
        backup_url.value = `https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri=${encodeURIComponent(redirect_url.value)}&app_id=${appid.value}`
    }
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
                <n-button @click="calculate">计算</n-button>
                <p>重定向URL</p>
                <n-input :value="redirect_url" type="textarea" placeholder="生成后将此链接填到 飞书开放平台-对应应用的开发者后台-安全设置=重定向URL 中" />
                <p>备份URL</p>
                <n-input :value="backup_url" type="textarea" placeholder="生成后点击此链接后授权即可使用备份功能" />
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