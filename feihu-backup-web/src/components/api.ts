import axios from "axios";
import JSZip from "jszip";
import { Converter } from "./converter";

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


export class FeishuService {
    convert = true
    constructor() {
    }

    async get_root_folder(user_token: string): Promise<RootFolder> {
        let r = await axios.get("/api/drive/explorer/v2/root_folder/meta", {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        return r.data.data
    }

    async app_login(app_id: string, app_secret: string): Promise<string> {
        let r = await axios.post("/api/auth/v3/tenant_access_token/internal/", {
            app_id: app_id,
            app_secret: app_secret
        })
        let token = r.data
        return token.tenant_access_token
    }

    async user_login(user_temp_code: string, server_token: string): Promise<UserLogin> {
        let r = await axios.post("/api/authen/v1/access_token", {
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
        let r = await axios.get(`/api/drive/explorer/v2/folder/${folder_token}/children`, {
            headers: {
                "Authorization": `Bearer ${user_token}`
            }
        })
        return r.data.data
    }

    async get_doc(doc_token: string, user_token: string): Promise<DocContentWrapper> {
        let r = await axios.get(`/api/doc/v2/${doc_token}/content`, {
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
            } else if (file.type === 'folder') {
                const fzip = zipfile.folder(file.name)
                await this._r_docs_in_folder(file.token, user_access, fzip!, convert)
            }
        }
    }
}
