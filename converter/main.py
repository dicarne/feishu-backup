from io import TextIOWrapper
import os
import json
import requests
import sys

def decorate(tag, style, dec, file: TextIOWrapper):
    if tag in style and style[tag]:
        file.write(dec)


def convertElement(element, file: TextIOWrapper):
    if element['type'] == 'textRun':
        t = element['textRun']
        if 'style' in t:
            style = t['style']
            decorate('codeInline', style, '`', file)
            decorate('bold', style, '**', file)
            decorate('italic', style, '*', file)
            file.write(t['text'])
            decorate('codeInline', style, '`', file)
            decorate('bold', style, '**', file)
            decorate('italic', style, '*', file)
        else:
            file.write(t['text'])
    elif element['type'] == 'equation':
        file.write("$$")
        file.write(element['equation']['equation'])
        file.write("$$\n")


def convertPara(fobj, out: TextIOWrapper, user_token, parnet_dir):
    try:
        blocks = fobj['body']['blocks']
        for p in blocks:
            if p['type'] == 'paragraph':
                pg = p['paragraph']
                els = pg['elements']
                if 'style' in pg:
                    if 'headingLevel' in pg['style']:
                        out.write('#'*pg['style']['headingLevel'])
                        out.write(' ')
                for e in els:
                    convertElement(e, out)
                out.write('\n\n')
            elif p['type'] == 'code':
                code = p['code']
                out.write("```")
                out.write(code['language'])
                out.write('\n')
                convertPara(code, out, user_token, parnet_dir)
                out.write("```\n\n")
            elif p['type'] == 'gallery':
                imgs = p['gallery']['imageList']
                for im in imgs:
                    token = im['fileToken']
                    filename = downloadAsset(os.path.join(
                        parnet_dir, 'assets'), token, user_token)
                    out.write(f'![](assets/{filename})\n\n')

    except Exception as e:
        print(fobj.keys())
        raise e


def convert(root_path, output_path, user_token):
    if os.path.isdir(root_path):
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        dirs = os.listdir(root_path)
        for dir in dirs:
            convert(os.path.join(root_path, dir),
                    os.path.join(output_path, dir), user_token)
    elif os.path.isfile(root_path) and root_path.endswith('.json'):
        with open(root_path, encoding='utf-8') as file, open(output_path+".md", 'w', encoding='utf-8') as out:
            file_content = file.readline()
            fobj = json.loads(file_content)
            title = fobj['title']
            convertPara(fobj, out, user_token, os.path.dirname(output_path))


def downloadAsset(asset_dir, id, token):
    if not os.path.exists(asset_dir):
        os.makedirs(asset_dir)
    for fp in os.listdir(asset_dir):
        if id == fp.split('.')[0]:
            return fp
    r = requests.get(f'https://open.feishu.cn/open-apis/drive/v1/medias/{id}/download',
                     headers={'Authorization': 'Bearer ' + token})
    mime = r.headers['Content-Type']
    ext = ""
    if mime == 'image/png':
        ext = ".png"
    elif mime == 'image/jpeg' or mime == 'image/jpg':
        ext = ".jpg"
    with open(os.path.join(asset_dir, id) + ext, 'wb') as fp:
        fp.write(r.content)
        fp.close()
    return id + ext


if __name__ == "__main__":
    if len(sys.argv) == 3:
        folder = sys.argv[1]
        output = sys.argv[2]
    else:
        folder = "backup"
        output = "output"
    with open(os.path.join(folder, "__user_token__")) as token:
        user_token = token.readline()
    convert(folder, output, user_token)
