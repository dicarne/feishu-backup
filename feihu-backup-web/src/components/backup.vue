<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { FeishuService } from './api';
import { saveAs } from 'file-saver'
import { useLocalStorage } from './hooks';
let router = useRoute()
let { app_id, app_secret } = router.params
let code = router.query.code as string
const userToken = ref("")
if (!code && router.query.access_token) {
    userToken.value = router.query.access_token as string
}
const feishu = new FeishuService()
const convert_md = useLocalStorage('convert_md', true)

onMounted(async () => {
    if (code) {
        app_id = app_id as string
        app_secret = app_secret as string
        const token = await feishu.app_login(app_id, app_secret)
        userToken.value = (await feishu.user_login(code, token)).access_token
        console.log(userToken.value)
    }
})

const SaveFile = async () => {
    const f = await feishu.get_all_docs(userToken.value, convert_md.value.value)
    saveAs(f, 'backup.zip')
}
</script>

<template>
    <button @click="SaveFile">Save File</button>
</template>