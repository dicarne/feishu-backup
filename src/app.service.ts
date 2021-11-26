import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as JSZip from "jszip";
import { app_id, app_secret } from './secret';

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

@Injectable()
export class AppService {



  constructor() {
    const buffer = require("buffer");
    globalThis.Blob = buffer.Blob;
    JSZip.support.blob = true;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async get_root_folder(user_token): Promise<RootFolder> {
    let r = await axios.get("https://open.feishu.cn/open-apis/drive/explorer/v2/root_folder/meta", {
      headers: {
        "Authorization": `Bearer ${user_token}`
      }
    })
    return r.data.data
  }

  async app_login() {
    let r = await axios.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/", {
      app_id: app_id,
      app_secret: app_secret
    })
    let token = r.data
    return token.tenant_access_token
  }

  async user_login(user_temp_code, server_token): Promise<UserLogin> {
    let r = await axios.post("https://open.feishu.cn/open-apis/authen/v1/access_token", {
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

  async get_files_in_folder(folder_token, user_token): Promise<FolderData> {
    let r = await axios.get(`https://open.feishu.cn/open-apis/drive/explorer/v2/folder/${folder_token}/children`, {
      headers: {
        "Authorization": `Bearer ${user_token}`
      }
    })
    return r.data.data
  }

  async get_doc(doc_token: string, user_token: string): Promise<DocContentWrapper> {
    let r = await axios.get(`https://open.feishu.cn/open-apis/doc/v2/${doc_token}/content`, {
      headers: {
        "Authorization": `Bearer ${user_token}`
      }
    })
    return r.data.data
  }

  async get_all_docs(code): Promise<Blob> {
    const zipfile = new JSZip()
    const apptoken = await this.app_login()
    const user_access = (await this.user_login(code, apptoken)).access_token
    const root = await this.get_root_folder(user_access)
    zipfile.file("__user_token__", user_access)
    await this._r_docs_in_folder(root.token, user_access, zipfile)
    return await zipfile.generateAsync({ type: 'blob' })
  }

  async _r_docs_in_folder(folder_token, user_access, zipfile: JSZip) {
    const root_folder = await this.get_files_in_folder(folder_token, user_access)
    for (let f_token in root_folder.children) {
      const file = root_folder.children[f_token]
      
      if (file.type === 'doc') {
        const file_content = (await this.get_doc(file.token, user_access)).content
        zipfile.file(file.name + ".json", file_content)
      } else if (file.type === 'folder') {
        const fzip = zipfile.folder(file.name)
        await this._r_docs_in_folder(file.token, user_access, fzip)
      }
    }
  }
}
