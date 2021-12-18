<script lang="ts" setup>
import { NButton, NSpace, NList, NListItem, NThing, NModal, NCard, NCascader, useMessage, useDialog } from 'naive-ui'
import { onMounted, Ref, ref } from 'vue';
import { useRoute } from 'vue-router';
import { FeishuService, WikiRecord } from './api';
import { saveAs } from 'file-saver'
import { useLocalStorage } from './hooks';
import { MyTreeSelectOption } from './interface'
let router = useRoute()
let { app_id, app_secret } = router.params
let code = router.query.code as string
const message = useMessage()
const dialog = useDialog()
const userToken = ref("")
if (!code && router.query.access_token) {
    userToken.value = router.query.access_token as string
}
const downloadingList = ref<string[]>([])
const feishu = new FeishuService((fname: string) => {
    downloadingList.value.push(fname)
})
const convert_md = useLocalStorage('convert_md', true)
const downloading = ref(false)

const page = ref<'docs' | 'wiki' | 'none'>('none')
const doc_options = ref<MyTreeSelectOption[]>()
const doc_options_value = ref<any>(null)

onMounted(async () => {
    if (code) {
        app_id = app_id as string
        app_secret = app_secret as string
        const token = await feishu.app_login(app_id, app_secret)
        userToken.value = (await feishu.user_login(code, token)).access_token
        let loc = window.location
        window.location.replace(`${loc.origin}${loc.pathname}#/backup/${app_id}/${app_secret}?access_token=${userToken.value}`)
        console.log(userToken.value)
    }
})

const SaveFile = async () => {
    openDownloadModel()
    try {
        page.value = 'docs'
        doc_options.value = await feishu.get_all_docs_list(userToken.value)
    } catch (error) {
        console.error(error)
        message.error("下载错误")
    }

    closeDownloadModel()
}

const SaveFileSelected = async () => {
    if (!doc_options_value.value) return
    openDownloadModel()
    let docs: string[] = doc_options_value.value
    const f = await feishu.get_some_docs(userToken.value, docs, true)
    saveAs(f, 'feishu_docs_' + new Date().toDateString() + '_backup.zip')
    closeDownloadModel()
}

const SaveFileAll = () => {
    dialog.warning({
        title: '警告',
        content: '下载所有文件可能耗时较长，推荐仅选择所需文件下载。是否继续下载全部文件？',
        positiveText: '确定',
        negativeText: '不确定',
        onPositiveClick: async () => {
            openDownloadModel()
            try {
                const f = await feishu.get_all_docs(userToken.value, convert_md.value.value)
                saveAs(f, 'backup.zip')
            } catch (error) {
                console.error(error)
                message.error("下载错误")
            }

            closeDownloadModel()
        },
        onNegativeClick: () => {
            
        }
    })

}

const wiki_spaces = ref<WikiRecord[]>([])
const SaveWiki = async () => {
    page.value = 'wiki'
    const wikis = await feishu.get_wiki_list(userToken.value)
    wiki_spaces.value = wikis
}

const downloadWikiSpace = async (space_id: string, space_name: string) => {
    openDownloadModel()
    try {
        const f = await feishu.get_all_wiki_in_space(userToken.value, space_id, true)
        saveAs(f, space_name + '_backup.zip')
    } catch (error) {
        console.error(error)
        message.error("下载错误")
    }
    closeDownloadModel()
}



const openDownloadModel = () => {
    downloadingList.value = []
    downloading.value = true
}
const closeDownloadModel = () => {
    downloading.value = false
}


const handleLoadDocFolder = async (option: any) => {
    const re = await feishu.get_all_docs_under_folder(userToken.value, option.value, option.depth)
    option.children = re
}
</script>

<template>
    <div class="main-stage">
        <n-space justify="space-around">
            <n-button strong secondary round type="primary" @click="SaveFile">下载云空间文档</n-button>
            <n-button strong secondary round type="primary" @click="SaveWiki">下载知识库文档</n-button>
        </n-space>
        <div :style="{
            padding: '10px'
        }">
            <n-space v-if="page === 'docs'" vertical>
                <n-cascader
                    v-model:value="doc_options_value"
                    multiple
                    :options="doc_options as any"
                    :cascade="true"
                    :check-strategy="'child'"
                    :show-path="false"
                    remote
                    :on-load="handleLoadDocFolder"
                    placeholder="选择文件"
                />
                <n-space justify="space-around">
                    <n-button strong secondary type="warning" @click="SaveFileAll">下载所有文件</n-button>
                    <n-button strong secondary type="info" @click="SaveFileSelected">下载选中文件</n-button>
                </n-space>
            </n-space>

            <n-space justify="space-around" v-if="page === 'wiki'">
                <n-list bordered>
                    <n-list-item v-for="item in wiki_spaces" :key="item.space_id">
                        <n-thing :title="item.name">{{ item.description }}</n-thing>
                        <template #suffix>
                            <n-button @click="downloadWikiSpace(item.space_id, item.name)">下载</n-button>
                        </template>
                    </n-list-item>
                </n-list>
            </n-space>
        </div>
    </div>
    <n-modal
        v-model:show="downloading"
        :mask-closable="false"
        title="下载中"
        @positive-click="closeDownloadModel"
        size="huge"
        :style="{ width: '400px', maxHeight: '600px' }"
    >
        <n-card>
            <template #header>下载中</template>
            <p v-for="item in downloadingList">{{ item }}</p>
            <template #footer>
                <n-button :loading="downloading">完成</n-button>
            </template>
        </n-card>
    </n-modal>
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