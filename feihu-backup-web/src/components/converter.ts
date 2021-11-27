
import JSZip from "jszip";
import localforage from 'localforage'
import axios from "axios";
import { feishu_api } from "./api";

class StringFile {
    file = ""
    constructor() {
    }
    write(text: string) {
        this.file += text
    }
}

interface TmpFile {
    mime: string
    data: any
}

export class Converter {
    tmp: LocalForage;
    constructor() {
        this.tmp = localforage.createInstance({
            name: 'file_cache'
        })
    }
    stringMul(str: string, times: number) {
        for (let index = 0; index < times - 1; index++) {
            str += str
        }
        return str
    }

    decorate(tag: string, style: any, dec: string, file: StringFile) {
        if (!!style[tag]) { file.write(dec) }
    }


    convertele(ele: any, file: StringFile) {
        if (ele['type'] == 'textRun') {
            let t = ele['textRun']
            if (t['style']) {
                let style = t['style']
                this.decorate('link', style, '[', file)
                this.decorate('codeInline', style, '`', file)
                this.decorate('bold', style, '**', file)
                this.decorate('italic', style, '*', file)
                file.write(t['text'])
                this.decorate('codeInline', style, '`', file)
                this.decorate('bold', style, '**', file)
                this.decorate('italic', style, '*', file)
                this.decorate('link', style, '](', file)
                if (style['link'])
                    this.decorate('link', style, style['link']['url'], file)
                this.decorate('link', style, ')', file)
            }
            else {
                file.write(t['text'])
            }
        }
        else if (ele['type'] == 'equation') {
            file.write("$$")
            file.write(ele['equation']['equation'])
            file.write("$$\n")
        }
    }

    async convertPara(fobj: any, out: StringFile, user_token: string, zip: JSZip) {

        let blocks = fobj['body']['blocks']
        for (let p of blocks) {
            if (p['type'] == 'paragraph') {
                let pg = p['paragraph']
                let els = pg['elements']
                if (pg['style']) {
                    const style = pg['style']
                    if (style['headingLevel']) {
                        out.write(this.stringMul('#', style['headingLevel']))
                        out.write(' ')
                    }
                    if (style['list'] && style['list']['type'] === 'checkbox') out.write('- [ ] ')
                    if (style['list'] && style['list']['type'] === 'bullet') out.write('- ')
                    if (style['list'] && style['list']['type'] === 'number') out.write(JSON.stringify(style['list']['number']) + '. ')
                    if (style['quote']) out.write('> ')
                }
                for (let e of els) {
                    this.convertele(e, out)
                }
                out.write('\n\n')
            }
            else if (p['type'] == 'code') {
                let code = p['code']
                out.write("```")
                out.write(code['language'])
                out.write('\n')
                await this.convertPara(code, out, user_token, zip)
                out.write("```\n\n")
            }
            else if (p['type'] == 'gallery') {
                let imgs = p['gallery']['imageList']
                for (let im of imgs) {
                    let token = im['fileToken']
                    let filename = await this.downloadAsset(token, user_token, zip)
                    out.write(`![](assets/${filename})\n\n`)
                }
            } else if (p['type'] == 'horizontalLine') {
                out.write('\n---\n\n')
            } else if (p['type'] == 'callout') {
                this.convertPara(p['callout'], out, user_token, zip)
            }
        }

    }
    async convert(user_token: string, zip: JSZip, fobj: any) {
        let out = new StringFile()
        await this.convertPara(fobj, out, user_token, zip)
        return out
    }


    async downloadAsset(id: string, token: string, zip: JSZip) {
        let c = await this.tmp.getItem<TmpFile>(id)
        let ext = ""
        if (c) {
            let mime = c.mime
            if (mime == 'image/png')
                ext = ".png"
            else if (mime == 'image/jpeg' || mime == 'image/jpg')
                ext = ".jpg"
            zip.folder("assets")?.file(id + ext, c.data)
        } else {
            let r = await axios.get(feishu_api(`/drive/v1/medias/${id}/download`),
                {
                    headers: { 'Authorization': 'Bearer ' + token },
                    responseType: 'arraybuffer'
                })
            let mime = r.headers['content-type']

            if (mime == 'image/png')
                ext = ".png"
            else if (mime == 'image/jpeg' || mime == 'image/jpg')
                ext = ".jpg"
            const data = new Uint8Array(r.data)
            zip.folder("assets")?.file(id + ext, data)
            await this.tmp.setItem(id, {
                mime: mime,
                data: data
            })
        }

        return id + ext
    }
}
