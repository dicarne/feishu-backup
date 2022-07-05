import axios, { AxiosResponse } from "axios"
import JSZip from "jszip"
import localforage from "localforage"
import { feishu_api } from "./api"
import { TmpFile } from "./converter"
interface ConvertContextArg {
    output_raw?: boolean
    async_tasks?: Promise<void>[]
}
interface ConvertContext {
    output_raw: boolean
    async_tasks: Promise<void>[]
}

export interface DocxBlock {
    block_id: string
    parent_id: string
    children: string[]
    block_type: BlockType
}
interface DocxPage extends DocxBlock {
    page: {
        elements: element[]
    }
}
interface DocxCode extends DocxBlock {
    code: BlockContent
}
interface DocxFile extends DocxBlock {
    file: {
        name: string
        token: string
    }
}
interface DocxImage extends DocxBlock {
    image: {
        width: number,
        height: number,
        token: string
    }
}
interface DocxTable extends DocxBlock {
    table: {
        cells: string[]
        property: {
            column_size: number
            column_width: number[]
            merge_info: { col_span: number, row_span: number }[]
            row_size: number
        }
    }
}
interface element {
    text_run?: {
        content: string
        text_element_style: {
            "bold": boolean,
            "inline_code": boolean,
            "italic": boolean,
            "strikethrough": boolean,
            "underline": boolean,
            link?: {
                url: string
            }
        }
    }
    equation?: {
        content: string
    }
    mention_doc?: {
        obj_type: number
        title: string
        token: string
        url: string
    }
}
enum textStyle {
    left = 1,
    center = 2,
    right = 3
}
interface BlockStyle {

    align?: textStyle,
    done: boolean,
    folded: boolean,
    language: number,
    wrap: boolean

}
interface BlockContent {
    elements: element[]
    style: BlockStyle
}
interface DocxText extends DocxBlock {
    text: BlockContent
}

function convertElements(ele: element[]) {
    let md = ""
    for (const e of ele) {
        if (e.text_run) {
            let ct = e.text_run.content
            let sty = e.text_run.text_element_style
            if (sty.link) {
                ct = `[${ct}](${decodeURIComponent(sty.link.url)})`
            }
            if (sty.bold) ct = "**" + ct.trim() + "**"
            if (sty.italic) ct = "*" + ct.trim() + "*"
            if (sty.inline_code) ct = "`" + ct + "`"
            md += ct
        } else if (e.equation) {
            md += "$" + e.equation.content.trim() + "$"
        } else if (e.mention_doc) {
            const mc = e.mention_doc!
            md +=  `[${mc.title}](${decodeURIComponent(mc.url)})`
        }
    }
    return md
}

export async function ConvertDocxToMD(ctx0: ConvertContextArg, parent: string, blocks: DocxBlock[], zip: JSZip, access: string, args?: { parent_prefix?: string, nonewline?: boolean }) {
    const r = await convertDocxToMD(ctx0, parent, blocks, zip, access, args)
    await Promise.all(ctx0.async_tasks || [])
    return r
}

async function convertDocxToMD(ctx0: ConvertContextArg, parent: string, blocks: DocxBlock[], zip: JSZip, access: string, args?: { parent_prefix?: string, nonewline?: boolean }) {
    let tmd = ""
    let continue_block_type = 0
    const ctx: ConvertContext = {
        output_raw: ctx0.output_raw ?? false,
        async_tasks: ctx0.async_tasks ?? []
    }
    ctx0.async_tasks = ctx.async_tasks
    for (const ele of blocks) {
        if (ele.parent_id != parent) {
            continue
        }
        if (continue_block_type != ele.block_type) {
            if (continue_block_type != 0) tmd += "\n"
            continue_block_type = 0
        }
        let block_next_line = "\n\n"
        let md = ""
        if (args?.parent_prefix) {
            md = args.parent_prefix + md
            block_next_line = "\n"
        }
        if (args?.nonewline) {
            block_next_line = ""
        }
        switch (ele.block_type) {
            case BlockType.page: {
                const e = ele as DocxPage
                md += "# " + convertElements(e.page.elements) + "\n\n"
                md += await convertDocxToMD(ctx, e.block_id, blocks, zip, access)
            }
                break;
            case BlockType.text: {
                const e = ele as DocxText
                md += convertElements(e.text.elements) + block_next_line
                break
            }
            case BlockType.code: {
                const e = ele as DocxCode
                const strLang = e.code.style.language <= code_language.length ? code_language[e.code.style.language - 1] : ""
                md += "```" + strLang + "\n" + convertElements(e.code.elements) + "\n```\n\n"
                break
            }
            case BlockType.h1: {
                const e = ele as DocxHeading
                md += "# " + convertElements(e.heading1.elements) + "\n\n"
                break
            }
            case BlockType.h2: {
                const e = ele as DocxHeading
                md += "## " + convertElements(e.heading2.elements) + "\n\n"
                break
            }
            case BlockType.h3: {
                const e = ele as DocxHeading
                md += "### " + convertElements(e.heading3.elements) + "\n\n"
                break
            }
            case BlockType.h4: {
                const e = ele as DocxHeading
                md += "#### " + convertElements(e.heading4.elements) + "\n\n"
                break
            }
            case BlockType.h5: {
                const e = ele as DocxHeading
                md += "##### " + convertElements(e.heading5.elements) + "\n\n"
                break
            }
            case BlockType.h6: {
                const e = ele as DocxHeading
                md += "###### " + convertElements(e.heading6.elements) + "\n\n"
                break
            }
            case BlockType.h7: {
                const e = ele as DocxHeading
                md += "####### " + convertElements(e.heading7.elements) + "\n\n"
                break
            }
            case BlockType.h8: {
                const e = ele as DocxHeading
                md += "######## " + convertElements(e.heading8.elements) + "\n\n"
                break
            }
            case BlockType.h9: {
                const e = ele as DocxHeading
                md += "######### " + convertElements(e.heading9.elements) + "\n\n"
                break
            }
            case BlockType.todo: {
                continue_block_type = BlockType.todo
                const e = (ele as any).todo as BlockContent
                if (e.style.done) {
                    md += "- [x] " + convertElements(e.elements) + "\n"
                } else {
                    md += "- [ ] " + convertElements(e.elements) + "\n"
                }
                break
            }
            case BlockType.orderList: {
                continue_block_type = BlockType.orderList
                const e = (ele as any).ordered as BlockContent
                md += "1. " + convertElements(e.elements) + "\n"
                break
            }
            case BlockType.bullet: {
                continue_block_type = BlockType.bullet
                const e = (ele as any).bullet as BlockContent
                md += "* " + convertElements(e.elements) + "\n"
                break
            }
            case BlockType.quote: {
                continue_block_type = BlockType.quote
                const e = ele.children
                md += await convertDocxToMD(ctx, ele.block_id, blocks, zip, access, { parent_prefix: "> " }) + "\n"
                break
            }
            case BlockType.image: {
                const e = ele as DocxImage
                const filename = await downloadAsset(ctx, e.image.token, access, zip)
                md += `![](assets/${filename})\n\n`
                break
            }
            case BlockType.grid: {
                md += await convertDocxToMD(ctx, ele.block_id, blocks, zip, access)
                break
            }
            case BlockType.grid_column: {
                md += await convertDocxToMD(ctx, ele.block_id, blocks, zip, access)
                break;
            }
            case BlockType.divider: {
                md += "---\n\n"
                break
            }
            case BlockType.view: {
                md += await convertDocxToMD(ctx, ele.block_id, blocks, zip, access)
                break
            }
            case BlockType.file: {
                const e = ele as DocxFile
                const name = e.file.name
                const token = e.file.token
                const path = await downloadAsset(ctx, token, access, zip, name)
                md += `[${name}](assets/${path})`
                break
            }
            case BlockType.table: {
                const e = ele as DocxTable
                const cols = e.table.property.column_size
                const rows = e.table.property.row_size
                const children = e.children
                const cells = blocks.filter(b => b.parent_id === e.block_id)
                //.map(b => blocks.find(a => a.block_id == b.children[0]))
                for (let i = 0; i < rows; i++) {
                    md += "|"
                    for (let j = 0; j < cols; j++) {
                        const index = i * rows + j
                        const it = cells[index]
                        if (!it) {
                            md += "  |"
                        } else {
                            md += await convertDocxToMD(ctx, it.block_id, blocks, zip, access, {
                                nonewline: true
                            }) + " |"
                        }
                    }
                    md += "\n"
                    if (i === 0) {
                        md += "|"
                        for (let j = 0; j < cols; j++) {
                            md += "---|"
                        }
                        md += "\n"
                    }
                }
                break
            }
            default:
                break;
        }
        tmd += md
    }
    return tmd
}
const tmp = localforage.createInstance({
    name: 'file_cache'
})
async function downloadAsset(ctx: ConvertContext, token: string, user_access: string, zip: JSZip, name?: string) {
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
        zip.folder("assets")?.file(name ? (token + "_" + name) : (token + ext), c.data)
    } else {
        const task = async () => {
            let r = await axios.get(feishu_api(`/drive/v1/medias/${token}/download`),
                {
                    headers: { 'Authorization': 'Bearer ' + user_access },
                    responseType: 'arraybuffer'
                })
            let mime = r.headers['content-type']

            if (mime == 'image/png')
                ext = ".png"
            else if (mime == 'image/jpeg' || mime == 'image/jpg')
                ext = ".jpg"
            const data = new Uint8Array(r.data)
            zip.folder("assets")?.file(name ? (token + "_" + name) : (token + ext), data)
            await tmp.setItem(token, {
                mime: mime,
                data: data
            })
            return r
        }
        await makeQPScall(4, ctx, task)
    }

    return name ? (token + "_" + name) : (token + ext)
}

async function makeQPScall(qps: number, ctx: ConvertContext, func: () => Promise<AxiosResponse<any, any>>) {
    if (ctx.async_tasks.length >= qps) {
        await Promise.allSettled(ctx.async_tasks)
        ctx.async_tasks = []
    }
    const callf = async () => {
        try {
            const p = await func()
        } catch (error) {
            makeQPScall(qps, ctx, func)
        }

    }
    ctx.async_tasks.push(callf())
}

enum BlockType {
    page = 1,       //
    text = 2,       //
    h1 = 3,         //
    h2 = 4,         //
    h3 = 5,         //
    h4 = 6,         //
    h5,             //
    h6,             //
    h7,             //
    h8,             //
    h9,             //
    bullet,    //
    orderList,      //
    code,           //
    ref = 15,       //
    equation,
    todo,           //
    bitable,
    callout,
    chat_card,
    diagram,
    divider,           //
    file = 23,
    grid,            //
    grid_column,       //
    iframe,
    image,          //
    widget,
    mindnote,
    sheet,
    table,
    tabel_cell,
    view,
    // ----
    quote = 34,     //
    unsupport = 999
}


interface DocxHeading extends DocxBlock {
    heading1: {
        elements: element[]
        style: BlockStyle
    }
    heading2: {
        elements: element[]
        style: BlockStyle
    }
    heading3: {
        elements: element[]
        style: BlockStyle
    }
    heading4: {
        elements: element[]
        style: BlockStyle
    }
    heading5: {
        elements: element[]
        style: BlockStyle
    }
    heading6: {
        elements: element[]
        style: BlockStyle
    }
    heading7: {
        elements: element[]
        style: BlockStyle
    }
    heading8: {
        elements: element[]
        style: BlockStyle
    }
    heading9: {
        elements: element[]
        style: BlockStyle
    }
}

const code_language = [
    "PlainText",
    "BAP",
    "da",
    "pache",
    "pex",
    "ssembly Language",
    "ash",
    "Sharp",
    "++",
    "C",
    "COBOL",
    "CSS",
    "CoffeeScript",
    "D",
    "Dart",
    "Delphi",
    "Django",
    "Dockerfile",
    "Erlang",
    "Fortran",
    "FoxPro",
    "Go",
    "Groovy",
    "HTML",
    "HTMLBars",
    "HTTP",
    "Haskell",
    "JSON",
    "Java",
    "JavaScript",
    "Julia",
    "Kotlin",
    "LateX",
    "Lisp",
    "Logo",
    "Lua",
    "MATLAB",
    "Makefile",
    "Markdown",
    "Nginx",
    "Objective-C",
    "OpenEdgeABL",
    "PHP",
    "Perl",
    "PostScript",
    "Power Shell",
    "Prolog",
    "ProtoBuf",
    "Python",
    "R",
    "RPG",
    "Ruby",
    "Rust",
    "SAS",
    "SCSS",
    "SQL",
    "Scala",
    "Scheme",
    "Scratch",
    "Shell",
    "Swift",
    "Thrift",
    "TypeScript",
    "VBScript",
    "Visual Basic",
    "XML",
    "YAML",
]