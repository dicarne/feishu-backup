<script lang="ts" setup>
import { NButton, NSpace, NList, NListItem, NThing, NModal, NCard, NCascader, useMessage, useDialog, NCheckbox, NCheckboxGroup, NTabs, NTabPane } from 'naive-ui'
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { FeishuService, WikiRecord, config, NodeRecord } from './api';
import { saveAs } from 'file-saver'
import { useLocalStorage } from './hooks';
import { MyTreeSelectOption } from './interface'
const error_message = "下载错误，请检查权限申请情况！"
let router = useRoute()
let { app_id, app_secret } = router.params
let code = router.query.code as string
const message = useMessage()
const dialog = useDialog()
const feishu = new FeishuService((fname: string) => {
    downloadingList.value.push(fname)
})
feishu.dialog = dialog
if (code && window.localStorage.getItem("code") == code) {
    feishu.user_access_token = window.localStorage.getItem("user_access_token") as string
    feishu.refresh_token = window.localStorage.getItem("refresh_token") as string
    feishu.app_id = app_id as string
    feishu.app_secret = app_secret as string
}
const downloadingList = ref<string[]>([])

const convert_md = useLocalStorage('convert_md', true)
const downloading = ref(false)

const page = ref<'docs' | 'wiki' | 'none'>('none')
const doc_options = ref<MyTreeSelectOption[]>()
const doc_options_value = ref<any>(null)
const peding = ref(false)
const loading_text = ref("登陆中")
const login = async () => {
    if (code && window.localStorage.getItem("code") != code) {
        peding.value = true
        const task = async () => {
            app_id = app_id as string
            app_secret = app_secret as string
            try {
                const token = await feishu.app_login(app_id, app_secret)
                await feishu.user_login(code, token)
                if (peding.value) {
                    window.localStorage.setItem("code", code)
                    peding.value = false
                }
            } catch (error) {
                if (error instanceof Error) {
                    loading_text.value = error.message
                    message.error(error.message)
                } else {
                    loading_text.value = "未知错误"
                }

            }

        }
        await task()
    }
    changeTab(currentTab.value)
}

onMounted(login)

const SaveFile = async () => {
    openDownloadModel()
    try {
        page.value = 'docs'
        doc_options.value = await feishu.get_all_docs_list()
    } catch (error) {
        console.error(error)
        message.error(error_message)
    }

    closeDownloadModel()
}

const SaveFileSelected = async () => {
    if (!doc_options_value.value) return
    openDownloadModel()
    let docs: string[] = doc_options_value.value
    const f = await feishu.get_some_docs(docs, true)
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
                const f = await feishu.get_all_docs(convert_md.value.value)
                saveAs(f, 'backup.zip')
            } catch (error) {
                console.error(error)
                message.error(error_message)
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
    try {
        const wikis = await feishu.get_wiki_list()
        wiki_spaces.value = wikis
    } catch (error) {
        console.error(error)
        message.error(error_message)
    }


}

const selectWikiPageDialogOpen = ref(false)
const currentWiki = reactive({
    space_id: "", space_name: ""
})
const currentWikiSpaceFirstLevelPages = ref<NodeRecord[]>([])
const openSelectWiki = async (space_id: string, space_name: string) => {
    try {
        selectWikiPageDialogOpen.value = true
        currentWiki.space_id = space_id
        currentWiki.space_name = space_name
        currentWikiSpaceFirstLevelPages.value = []
        let roots = await feishu.get_wiki_nodes_root(space_id)
        currentWikiSpaceFirstLevelPages.value = roots
    } catch (error) {
        console.error(error)
        message.error(error_message)
    }

}
const downloadOneWikiPage = async (node: NodeRecord) => {
    openDownloadModel()
    try {
        const f = await feishu.get_one_wiki_in_sapce(currentWiki.space_id, true, node)
        saveAs(f, currentWiki.space_name + "_" + node.title + '_backup.zip')
    } catch (error) {
        console.error(error)
        message.error(error_message)
    }
    closeDownloadModel()
}
const downloadWikiSpace = async () => {
    openDownloadModel()
    try {
        const f = await feishu.get_all_wiki_in_space(currentWiki.space_id, true)
        saveAs(f, currentWiki.space_name + '_backup.zip')
    } catch (error) {
        console.error(error)
        message.error(error_message)
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
    try {
        const re = await feishu.get_all_docs_under_folder(option.value, option.depth)
        option.children = re
    } catch (error) {
        console.error(error)
        message.error(error_message)
    }

}

const wikis = ref<null | any[]>(null)
const downloadSelectedWikis = async () => {
    openDownloadModel()

    if (wikis.value != null) {
        for (let i = 0; i < wikis.value.length; i++) {
            const e = wikis.value[i];
            const info: { space: string, name: string } = JSON.parse(e)
            try {
                const f = await feishu.get_all_wiki_in_space(info.space, true)
                saveAs(f, info.name + '_backup.zip')
            } catch (error) {
                console.error(error)
                message.error(error_message)
            }
        }
    }
    closeDownloadModel()
}

const downloadAllWikis = async () => {
    openDownloadModel()
    for (let i = 0; i < wiki_spaces.value.length; i++) {
        const e = wiki_spaces.value[i];
        try {
            const f = await feishu.get_all_wiki_in_space(e.space_id, true)
            saveAs(f, e.name + '_backup.zip')
        } catch (error) {
            console.error(error)
            message.error(error_message)
        }
    }
    closeDownloadModel()
}

const currentTab = ref<string | number>("tab-cloud")
const changeTab = (value: string | number) => {
    currentTab.value = value
    switch (value) {
        case "tab-cloud":
            SaveFile()
            break;
        case "tab-wiki":
            SaveWiki()
            break;
        default:
            break;
    }
}

</script>

<template>
    <div class="main-stage">
        <n-tabs type="segment" :value="currentTab" :on-update:value="changeTab">
            <n-tab-pane name="tab-cloud" tab="云空间文档"></n-tab-pane>
            <n-tab-pane name="tab-wiki" tab="知识库文档"></n-tab-pane>
        </n-tabs>
        <div :style="{
            padding: '10px'
        }">
            <n-space v-if="page === 'docs'" vertical>
                <n-cascader v-model:value="doc_options_value" multiple allow-checking-not-loaded :options="doc_options"
                    cascade :check-strategy="'child'" :show-path="false" remote :on-load="handleLoadDocFolder"
                    placeholder="选择文件" />
                <n-space justify="space-around">
                    <n-button strong secondary type="warning" @click="SaveFileAll">下载所有文件</n-button>
                    <n-button strong secondary type="info" @click="SaveFileSelected">下载选中文件</n-button>
                </n-space>
            </n-space>

            <n-space v-if="page === 'wiki'" justify="space-around">
                <n-button @click="downloadAllWikis">下载全部知识空间</n-button>
                <n-button @click="downloadSelectedWikis">下载选中知识空间</n-button>
            </n-space>

            <n-space justify="space-around" v-if="page === 'wiki'" :style="{
                maxHeight: '80vh', overflow: 'auto'
            }">
                <n-checkbox-group v-model:value="wikis">
                    <n-list bordered>
                        <n-list-item v-for="item in wiki_spaces" :key="item.space_id">
                            <template #prefix>
                                <n-checkbox :value="JSON.stringify({ space: item.space_id, name: item.name })" />
                            </template>
                            <n-thing :title="item.name">{{ item.description }}</n-thing>
                            <template #suffix>
                                <n-button @click="openSelectWiki(item.space_id, item.name)">选择</n-button>
                            </template>
                        </n-list-item>
                    </n-list>
                </n-checkbox-group>

            </n-space>
        </div>
    </div>
    <n-modal v-model:show="downloading" :mask-closable="false" title="下载中" @positive-click="closeDownloadModel" size="huge"
        :style="{ width: '400px', maxHeight: '600px' }">
        <n-card>
            <template #header>下载中</template>
            <div :style="{
                overflow: 'auto',
                maxHeight: '400px'
            }">
                <p v-for="item in downloadingList">{{ item }}</p>
            </div>

            <template #footer>
                <n-button :loading="downloading">完成</n-button>
            </template>
        </n-card>
    </n-modal>
    <n-modal v-model:show="peding" :mask-closable="false" title="登录中" size="huge"
        :style="{ width: '400px', maxHeight: '600px' }">
        <n-card>
            <template #header>{{ loading_text }}</template>
        </n-card>
    </n-modal>
    <n-modal v-model:show="selectWikiPageDialogOpen" title="选择下载" size="huge"
        :style="{ width: '400px', maxHeight: '600px', minHeight: '300px' }">
        <n-card :style="{
            overflow: 'auto'
        }">
            <template #header>选择下载指定知识空间页面</template>
            <n-list bordered>
                <n-list-item>
                    <n-thing :title="'全部页面'"></n-thing>
                    <template #suffix>
                        <n-button @click="downloadWikiSpace">下载</n-button>
                    </template>
                </n-list-item>
                <n-list-item v-for="item in currentWikiSpaceFirstLevelPages" :key="item.node_token">
                    <n-thing :title="item.title"></n-thing>
                    <template #suffix>
                        <n-button @click="downloadOneWikiPage(item)">下载</n-button>
                    </template>
                </n-list-item>
            </n-list>
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