import axios from "axios";
import JSZip from "jszip";
import { Converter } from "./converter";
import * as secret from "../../secret"

export function feishu_api(url: string) {
    //return "api"
    return secret.baseUrl + url
}

function feishu_api_noauth(url: string) {
    return  secret.baseUrl_noauth + url
}

export interface UserLogin {
    access_token: string
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


export class FeishuService {
    convert = true
    downloadingCallback?: (file: string) => void
    constructor(downloadingCallback?: (file: string) => void) {
        this.downloadingCallback = downloadingCallback
    }

    async get_root_folder(user_token: string): Promise<RootFolder> {
        let r = await axios.get(feishu_api("/drive/explorer/v2/root_folder/meta"), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        return r.data.data
    }

    async app_login(app_id: string, app_secret: string): Promise<string> {
        let r = await axios.post(feishu_api_noauth("/auth/v3/tenant_access_token/internal/"), {
            app_id: app_id,
            app_secret: app_secret
        })
        let token = r.data
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
        if (r.data?.code) console.log(r.data)
        return r.data.data
    }

    async get_files_in_folder(folder_token: string, user_token: string): Promise<FolderData> {
        let r = await axios.get(feishu_api(`/drive/explorer/v2/folder/${folder_token}/children`), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        return r.data.data
    }

    async get_doc(doc_token: string, user_token: string): Promise<DocContentWrapper> {
        let r = await axios.get(feishu_api(`/doc/v2/${doc_token}/content`), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        return r.data.data
    }

    async get_all_docs(user_access: string, convert_md: boolean): Promise<Blob> {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        //console.log(user_access)
        const root = await this.get_root_folder(user_access)
        //zipfile.file("__user_token__", user_access)
        await this._r_docs_in_folder(root.token, user_access, zipfile, convert)
        return await zipfile.generateAsync({ type: 'blob' })
    }

    async _r_docs_in_folder(folder_token: string, user_access: string, zipfile: JSZip, convert: Converter) {
        const root_folder = await this.get_files_in_folder(folder_token, user_access)
        for (let f_token in root_folder.children) {
            const file = root_folder.children[f_token]

            if (file.type === 'doc') {
                const file_content = (await this.get_doc(file.token, user_access)).content
                let fileobj = JSON.parse(file_content)

                if (this.convert) zipfile.file(file.name + ".md", (await convert.convert(user_access, zipfile, fileobj)).file)
                else zipfile.file(file.name + ".json", file_content)
                this.downloadingCallback?.(file.name)
            } else if (file.type === 'folder') {
                const fzip = zipfile.folder(file.name)
                await this._r_docs_in_folder(file.token, user_access, fzip!, convert)
            }
        }
    }

    async get_wiki_list(user_token: string, page_token?: string): Promise<WikiRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces?page_size=10${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        const d = r.data.data as WikiList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_list(user_token, d.page_token)]
        }
        return list
    }

    async get_wiki_nodes_root(user_token: string, space_id: string, page_token?: string): Promise<NodeRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces/${space_id}/nodes?page_size=50${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        const d = r.data.data as WikiNodeList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_nodes_root(user_token, space_id, d.page_token)]
        }
        return list
    }

    async get_wiki_nodes(user_token: string, space_id: string, parent_node: string, page_token?: string): Promise<NodeRecord[]> {
        let r = await axios.get(feishu_api(`/wiki/v2/spaces/${space_id}/nodes?page_size=50&parent_node_token=${parent_node}${page_token ? '&page_token=' + page_token : ''}`), {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        const d = r.data.data as WikiNodeList
        let list = d.items
        if (d.has_more) {
            list = [...list, ...await this.get_wiki_nodes(user_token, space_id, d.page_token)]
        }
        return list
    }

    async get_all_wiki_in_space(user_token: string, space_id: string, convert_md: boolean) {
        const zipfile = new JSZip()
        const convert = new Converter()
        this.convert = convert_md
        const root = await this.get_wiki_nodes_root(user_token, space_id)
        await this._r_get_all_wiki_in_space(user_token, space_id, root, zipfile, convert)
        return await zipfile.generateAsync({ type: 'blob' })
    }

    async _r_get_all_wiki_in_space(user_access: string, space_id: string, nodes: NodeRecord[], zipfile: JSZip, convert: Converter) {
        for (let node of nodes) {
            if (node.has_child) {
                let subzip = zipfile.folder(node.title)
                let nodes = await this.get_wiki_nodes(user_access, space_id, node.node_token)
                await this._r_get_all_wiki_in_space(user_access, space_id, nodes, subzip!, convert)
            }
            if (node.obj_type === 'doc') {
                const file_content = (await this.get_doc(node.obj_token, user_access)).content
                let fileobj = JSON.parse(file_content)

                if (this.convert) zipfile.file(node.title + ".md", (await convert.convert(user_access, zipfile, fileobj)).file)
                else zipfile.file(node.title + ".json", file_content)
                this.downloadingCallback?.(node.title)
            } else {
                console.warn("Not Impl doc type: " + node.obj_type)
            }
        }
    }
}
