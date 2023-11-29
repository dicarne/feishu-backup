import axios from "axios";
import JSZip from "jszip";
import { Converter, TmpFile } from "./converter";
import { MyTreeSelectOption } from "./interface";
import { stringNullIsDefault } from "../lib/stringUtil";
import { ConvertDocxToMD } from "./convert_docx";
import localforage from "localforage";
import { DialogApiInjection } from "naive-ui/es/dialog/src/DialogProvider";

export const config = { ProxyAPI: false }

const proxy_url = import.meta.env.VITE_PROXY_API_URL

export async function testLocalServer() {
    if (import.meta.env.VITE_SERVER === undefined) {
        config.ProxyAPI = true
        return false
    }
    try {
        const r = await fetch(`${import.meta.env.VITE_SERVER}/ping`)
        const rj = await r.json()
        return rj.code === 0
    } catch (error) {
        config.ProxyAPI = true
        return false
    }

}

export function feishu_api(url: string) {
    if (config.ProxyAPI && !!proxy_url) {
        return proxy_url + url
    }
    return import.meta.env.VITE_API_URL + url
}

export interface UserLogin {
    access_token: string
    refresh_token: string
    expires_in: number
}

export interface RootFolder {
    token: string
    id: string
    user_id: string
}

export interface FoldFileMeta {
    name: string
    token: string
    type: string
}

export interface FolderFile {
    [key: string]: FoldFileMeta
}

export interface FolderData {
    children: FolderFile
    parentToken: string
}

export interface FolderMeta {
    id: string
    token: string
    name: string
    parentId: string
}

export interface DocContentWrapper {
    content: string
    revision: number
}

export interface WikiRecord {
    space_id: string
    name: string
    description: string
}

export interface WikiList {
    items: WikiRecord[]
    has_more: boolean
    page_token: string
}

export interface NodeRecord {
    has_child: boolean
    node_token: string
    node_type: string
    obj_token: string
    obj_type: string
    origin_node_token: string
    origin_space_id: string
    parent_node_token: string
    space_id: string
    title: string
}

export interface WikiNodeList {
    has_more: boolean
    page_token: string
    items: NodeRecord[]
}

export interface FolderTokenJson {
    token: string
    name: string
    path: string[]
    type: string
}

export class DocTree {
    type: 'doc' | 'dir' | 'root'
    token: string
    children: DocTree[]
    name: string
    constructor(type: 'doc' | 'dir' | 'root', token: string, name: string) {
        this.type = type
        this.token = token
        this.children = []
        this.name = name
    }
}

const tmp = localforage.createInstance({
    name: 'file_cache'
})

export class FeishuService {
    convert = true
    downloadingCallback?: (file: string) => void
    constructor(downloadingCallback?: (file: string) => void) {
        this.downloadingCallback = downloadingCallback
        this.user_expires_in = JSON.parse(window.localStorage.getItem("user_expires_in") ?? "0")
    }
    dialog?: DialogApiInjection
    tenant_access_token?: string
    user_access_token?: string
    tenant_expires_in?: number
    user_expires_in?: number
    refresh_token?: string
    app_id?: string
    app_secret?: string
    async userAccess(): Promise<string> {
        if (!this.tenant_expires_in || this.tenant_expires_in < Date.now()) {
            await this.app_login()
        }
        try {
            if (!this.user_expires_in || this.user_expires_in < Date.now()) {
                await this.refresh_user_access(this.refresh_token!, this.tenant_access_token!)
            }
        } catch (error) {
            if (this.dialog) {
                this.dialog.error({
                    title: "错误",
                    content: "刷新用户token失败，请重新认证！"
                })
            }
        }

        return this.user_access_token!
    }

    async get_root_folder(): Promise<RootFolder> {
        let r = await axios.get(feishu_api("/drive/explorer/v2/root_folder/meta"), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        return r.data.data
    }

    async app_login(app_id?: string, app_secret?: string): Promise<string> {
        if (!app_id) {
            app_id = this.app_id
            app_secret = this.app_secret
        }
        let r = await axios.post(feishu_api("/auth/v3/tenant_access_token/internal/"), {
            app_id: app_id,
            app_secret: app_secret
        })
        let token = r.data
        this.tenant_expires_in = Date.now() + (token.expire - 20 * 60) * 1000
        this.app_id = app_id
        this.app_secret = app_secret
        this.tenant_access_token = token.tenant_access_token
        return token.tenant_access_token
    }

    async user_login(user_temp_code: string, server_token: string): Promise<UserLogin> {
        let r = await axios.post(feishu_api("/authen/v1/access_token"), {
            "grant_type": "authorization_code",
            "code": user_temp_code
        }, {
            headers: {
                "Authorization": `Bearer ${server_token}`
            }
        })
        if (r.data?.code) {
            throw new Error(JSON.stringify(r.data))
        }
        const user = r.data.data as UserLogin
        this.user_expires_in = Date.now() + (user.expires_in - 20 * 60) * 1000
        this.user_access_token = user.access_token
        this.refresh_token = user.refresh_token


        window.localStorage.setItem("user_access_token", user.access_token)
        window.localStorage.setItem("refresh_token", user.refresh_token)
        return user
    }

    async refresh_user_access(user_refreash_code: string, server_token: string): Promise<UserLogin> {
        let r = await axios.post(feishu_api("/authen/v1/refresh_access_token"), {
            "grant_type": "refresh_token",
            "refresh_token": user_refreash_code
        }, {
            headers: {
                "Authorization": `Bearer ${server_token}`
            }
        })
        if (r.data?.code) console.log(r.data)
        const user = r.data.data as UserLogin
        this.user_expires_in = Date.now() + (user.expires_in - 20 * 60) * 1000
        this.user_access_token = user.access_token
        this.refresh_token = user.refresh_token

        window.localStorage.setItem("user_access_token", user.access_token)
        window.localStorage.setItem("refresh_token", user.refresh_token)
        window.localStorage.setItem("user_expires_in", JSON.stringify(this.user_expires_in))
        return user
    }

    async get_folder_meta(folder_token: string): Promise<FolderMeta> {
        let r = await axios.get(feishu_api(`/drive/explorer/v2/folder/${folder_token}/meta`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        return r.data.data
    }

    async get_files_in_folder(folder_token: string): Promise<FolderData> {
        let r = await axios.get(feishu_api(`/drive/explorer/v2/folder/${folder_token}/children`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        return r.data.data
    }

    async get_doc(doc_token: string): Promise<DocContentWrapper> {
        let r = await axios.get(feishu_api(`/doc/v2/${doc_token}/content`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        return r.data.data
    }
    async get_docx_next(doc_token: string, page_token: string): Promise<any[]> {
        let r = await axios.get(feishu_api(`/docx/v1/documents/${doc_token}/blocks?page_token=${page_token}`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })

        const d = r.data.data
        let blocks = d.items
        if (d.has_more) {
            const page_token = d.page_token
            const next = await this.get_docx_next(doc_token, page_token)
            blocks = [...blocks, ...next]
        }
        return blocks
    }
    async get_docx(doc_token: string): Promise<any[]> {
        let r = await axios.get(feishu_api(`/docx/v1/documents/${doc_token}/blocks`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })

        const d = r.data.data
        let blocks = d.items
        if (d.has_more) {
            const page_token = d.page_token
            const next = await this.get_docx_next(doc_token, page_token)
            blocks = [...blocks, ...next]
        }
        return blocks
    }

    async get_file(token: string, zip: JSZip, name?: string) {
        let c = await tmp.getItem<TmpFile>(token)
        let ext = ""
        if (c) {
            let mime = c.mime
            const mtype = mime.split("/")
            if (mtype.length === 2) {
                ext = "." + mtype[1]
            } else {
                console.log(mtype)
            }
            zip.file(name ? name : (token + ext), c.data)
        } else {
            const task = async () => {
                let r = await axios.get(feishu_api(`/drive/v1/files/${token}/download`),
                    {
                        headers: { 'Authorization': 'Bearer ' + await this.userAccess() },
                        responseType: 'arraybuffer'
                    })
                let mime = r.headers['content-type']

                if (mime == 'image/png')
                    ext = ".png"
                else if (mime == 'image/jpeg' || mime == 'image/jpg')
                    ext = ".jpg"
                const data = new Uint8Array(r.data)
                zip.file(name ? name : (token + ext), data)
                await tmp.setItem(token, {
                    mime: mime,
                    data: data
                })
                return r
            }
            await task();
        }

        return name ? (token + "_" + name) : (token + ext)
    }

    async get_all_docs(convert_md: boolean): Promise<Blob> {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        const root = await this.get_root_folder()
        await this._r_docs_in_folder(root.token, zipfile, convert)
        return await zipfile.generateAsync({ type: 'blob' })
    }

    zipfileName(rawname: string, zip: JSZip, ext: string) {
        let name = stringNullIsDefault(rawname, "未命名文档")
        let ind = 1
        let rename = ''
        while (zip.file(name + rename + ext)) {
            rename = String(ind)
            ind += 1
        }
        name = name + rename + ext
        return name
    }
    async save_doc(file: FolderTokenJson, zip: JSZip, convert: Converter) {
        await this._save_doc(file.token, file.name, zip, convert)
    }
    async save_docx(file: FolderTokenJson, zip: JSZip) {
        await this._save_docx(file.token, file.name, zip)
    }
    async save_doc_wiki(file: NodeRecord, zip: JSZip, convert: Converter) {
        await this._save_doc(file.obj_token, file.title, zip, convert)
    }
    async save_docx_wiki(file: NodeRecord, zip: JSZip) {
        await this._save_docx(file.obj_token, file.title, zip)
    }
    async _save_doc(token: string, filename: string, zip: JSZip, convert: Converter) {
        const file_content = (await this.get_doc(token)).content
        let fileobj = JSON.parse(file_content)

        let name = this.zipfileName(filename, zip, ".json")
        let mdname = this.zipfileName(filename, zip, ".md")
        zip.file(name, JSON.stringify({ node: fileobj, type: "docx" }))
        try {
            zip.file(mdname, (await convert.convert(await this.userAccess(), zip, fileobj)).file)
        } catch (error) {
            console.log(error)
            zip.file(mdname, JSON.stringify({ error: error, msg: "convert error" }))
        }
        this.downloadingCallback?.(filename)
    }

    async _save_docx(token: string, filename: string, zip: JSZip) {
        const content = await this.get_docx(token)
        let name = this.zipfileName(filename, zip, ".json")
        let mdname = this.zipfileName(filename, zip, ".md")
        zip.file(name, JSON.stringify({ nodes: content, type: "docx" }))
        try {
            zip.file(mdname, await ConvertDocxToMD({}, "", content, zip, await this.userAccess()))
        }
        catch (e) {
            zip.file(mdname, JSON.stringify({ error: e, msg: "convert error" }))
            console.error(e)
        }
        this.downloadingCallback?.(filename)
    }

    async get_some_docs(docs: string[], convert_md: boolean = true): Promise<Blob> {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        for (const it of docs) {
            let j: FolderTokenJson = JSON.parse(it)
            let zip = zipfile
            for (const p of j.path) {
                zip = zip.folder(p)!
            }
            if (j.type === "doc") {
                await this.save_doc(j, zip, convert)
            } else if (j.type === "docx") {
                await this.save_docx(j, zip)
            } else if (j.type === "folder") {
                await this._r_docs_in_folder(j.token, zip, convert)
            } else if (j.type === "file") {
                await this.get_file(j.token, zip, j.name)
            }
        }

        return await zipfile.generateAsync({ type: 'blob' })
    }

    async _r_docs_in_folder(folder_token: string, zipfile: JSZip, convert: Converter) {
        const root_folder = await this.get_files_in_folder(folder_token)
        for (let f_token in root_folder.children) {
            const file = root_folder.children[f_token]
            const fd: FolderTokenJson = {
                token: file.token,
                name: file.name,
                path: [""],
                type: file.type
            }
            if (file.type === 'doc') {
                await this.save_doc(fd, zipfile, convert)
            } else if (file.type === 'folder') {
                const fzip = zipfile.folder(file.name)
                await this._r_docs_in_folder(file.token, fzip!, convert)
            } else if (file.type === 'docx') {
                await this.save_docx(fd, zipfile)
            } else if (file.type === "file") {
                await this.get_file(file.token, zipfile, file.name)
            }
        }
    }


    async get_all_docs_under_folder(folder_token_json: string, depth: number): Promise<MyTreeSelectOption[]> {
        let options: MyTreeSelectOption[] = []
        let j: FolderTokenJson = JSON.parse(folder_token_json)
        const root_folder = await this.get_files_in_folder(j.token)

        const folder_promise = []
        for (let f_token in root_folder.children) {
            const file = root_folder.children[f_token]
            if (file.type === 'doc' || file.type === "docx") {
                let mj: FolderTokenJson = {
                    token: file.token,
                    path: [...j.path],
                    name: file.name,
                    type: file.type
                }
                options.push({
                    label: stringNullIsDefault(file.name, "未命名文档"),
                    value: JSON.stringify(mj),
                    isLeaf: true,
                    depth: depth + 1
                })
            } else if (file.type === 'folder') {
                const f = async () => {
                    let name = (await this.get_folder_meta(file.token)).name
                    let mj: FolderTokenJson = {
                        token: file.token,
                        path: [...j.path, name],
                        name: '',
                        type: file.type
                    }
                    options.push({
                        label: name,
                        value: JSON.stringify(mj),
                        isLeaf: false,
                        depth: depth + 1
                    })
                }
                folder_promise.push(f())
            } else if (file.type === "file") {
                let mj: FolderTokenJson = {
                    token: file.token,
                    path: [...j.path],
                    name: file.name,
                    type: file.type
                }
                options.push({
                    label: stringNullIsDefault(file.name, "未命名文件"),
                    value: JSON.stringify(mj),
                    isLeaf: true,
                    depth: depth + 1
                })
            }
        }
        await Promise.all(folder_promise)
        return options
    }

    async get_all_docs_list(): Promise<MyTreeSelectOption[]> {
        const root = await this.get_root_folder()
        let mj: FolderTokenJson = {
            token: root.token,
            path: [],
            name: '',
            type: 'root'
        }
        return await this.get_all_docs_under_folder(JSON.stringify(mj), 0)
    }

    async get_wiki_list(page_token?: string): Promise<WikiRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces?page_size=10${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        const d = r.data.data as WikiList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_list(d.page_token)]
        }
        return list
    }

    async get_wiki_nodes_root(space_id: string, page_token?: string): Promise<NodeRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces/${space_id}/nodes?page_size=50${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        const d = r.data.data as WikiNodeList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_nodes_root(space_id, d.page_token)]
        }
        return list
    }

    async get_wiki_nodes(space_id: string, parent_node: string, page_token?: string): Promise<NodeRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces/${space_id}/nodes?page_size=50&parent_node_token=${parent_node}${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${await this.userAccess()}`
            }
        })
        const d = r.data.data as WikiNodeList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_nodes(space_id, d.page_token)]
        }
        return list
    }

    async get_all_wiki_in_space(space_id: string, convert_md: boolean) {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        const root = await this.get_wiki_nodes_root(space_id)
        await this._r_get_all_wiki_in_space(space_id, root, zipfile, convert)
        return await zipfile.generateAsync({ type: 'blob' })
    }

    async get_one_wiki_in_sapce(space_id: string, convert_md: boolean, node: NodeRecord) {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        await this._r_get_all_wiki_in_space(space_id, [node], zipfile, convert)
        return await zipfile.generateAsync({ type: 'blob' })
    }

    async _r_get_all_wiki_in_space(space_id: string, nodes: NodeRecord[], zipfile: JSZip, convert: Converter) {
        for (let node of nodes) {
            if (node.has_child) {
                let subzip = zipfile.folder(node.title)
                let nodes = await this.get_wiki_nodes(space_id, node.node_token)
                await this._r_get_all_wiki_in_space(space_id, nodes, subzip!, convert)
            }
            if (node.obj_type === 'doc') {
                await this.save_doc_wiki(node, zipfile, convert)
            } else if (node.obj_type === 'docx') {
                await this.save_docx_wiki(node, zipfile)
            } else {
                console.warn("Not Impl doc type: " + node.obj_type)
            }
        }
    }
}
