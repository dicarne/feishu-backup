
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

export interface TmpFile {
    mime: string
    data: any
}
export function decorate(tag: string, style: any, dec: string, file: StringFile) {
    if (!!style[tag]) { file.write(dec) }
}
export class Converter {
    tmp: LocalForage;
    docLinks: Map<string, string>
    constructor() {
        this.tmp = localforage.createInstance({
            name: 'file_cache'
        })
        this.docLinks = new Map<string, string>()
    }
    stringMul(str: string, times: number) {
        let ret = str
        for (let index = 0; index < times - 1; index++) {
            ret += str
        }
        return ret
    }

    

    convertele(ele: any, file: StringFile) {
        if (ele['type'] == 'textRun') {
            let t = ele['textRun']
            if (t['style']) {
                let style = t['style']
                decorate('link', style, '[', file)
                decorate('codeInline', style, '`', file)
                decorate('bold', style, '**', file)
                decorate('italic', style, '*', file)
                file.write(t['text'])
                decorate('codeInline', style, '`', file)
                decorate('bold', style, '**', file)
                decorate('italic', style, '*', file)
                decorate('link', style, '](', file)
                if (style['link']) {
                    let url = decodeURIComponent(style['link']['url'])
                    decorate('link', style, url, file)
                }
                decorate('link', style, ')', file)
            }
            else {
                file.write(t['text'])
            }
        }
        else if (ele['type'] == 'equation') {
            file.write("$$")
            file.write(ele['equation']['equation'])
            file.write("$$\n")
        } else if (ele['type'] == 'docsLink') {
            let inline = new RegExp('https://\\w*.feishu.cn/((wiki)|(docs))/\\w+(?<id>#\\w+)')
            let url = ele['docsLink']['url']
            if (inline.test(url)) {
                let g = inline.exec(url)?.groups?.['id'] ?? ""
                file.write(`[${g}](${g})`)
            }
        }
    }

    async convertPara(fobj: any, out: StringFile, user_token: string, zip: JSZip) {
        let blocks = fobj['body']['blocks']
        for (let p of blocks) {
            if (p['type'] == 'paragraph') {
                let pg = p['paragraph']
                let lineId = pg['lineId']
                let els = pg['elements']
                if (pg['style']) {
                    const style = pg['style']
                    if (style['headingLevel']) {
                        out.write(this.stringMul('#', style['headingLevel']))
                        out.write(' ')
                    } else {
                        lineId = null
                    }
                    if (style['list'] && style['list']['type'] === 'checkbox') out.write('- [ ] ')
                    if (style['list'] && style['list']['type'] === 'bullet') out.write('- ')
                    if (style['list'] && style['list']['type'] === 'number') out.write(JSON.stringify(style['list']['number']) + '. ')
                    if (style['quote']) out.write('> ')
                } else {
                    lineId = null
                }
                for (let e of els) {
                    if (lineId) {
                        out.write(`<span id="${lineId}">`)
                    }
                    let innerText = new StringFile()
                    this.convertele(e, innerText)
                    out.write(innerText.file)
                    if (lineId) {
                        this.docLinks.set(lineId, innerText.file)
                        out.write("</span>")
                    }
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
        for (const it of this.docLinks) {
            let [key, title] = it
            out.file = replaceAll(out.file, `\\[#${key}\\]\\(#${key}\\)`, `[${title}](#${key})`)
        }
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

function replaceAll(str: string, f: string, e: string) {//吧f替换成e
    var reg = new RegExp(f, "g"); //创建正则RegExp对象   
    return str.replace(reg, e);
}
