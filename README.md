## 飞书云文档备份

用于备份下载所有飞书云文档。

先在飞书开放平台创建应用，授予足够的权限：把云空间相关的都点上。

记住`app_id`和`app_secret`，构造url: `https://{{your_server}}/tool/feishu-backup/{{app_id}}/{{app_secret}}`。在飞书应用后台的安全设置中的重定向中写入这个url。

把这个url encode后，作为`{{your_direct_url}}`。

启动备份的URL：中间需要替换你自己的重定向URL和APP_ID  
`https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={{your_direct_url}}&app_id={{app_id}}`

打开这个链接，然后授权，点击按钮，等待下载。（目前暂时没有测试过文件很多的时候是否会崩溃）

## 部署
`feishu-backup-web`下

```
pnpm i
pnpm run build
```

然后把`dist`下的生成文件放到你的网页文件夹中。

在`nginx`中代理`/tool/feishu-backup/api/`到`https://open.feishu.cn/open-apis`。

## TODO
暂时只支持部分我需要的格式转换，所以很多格式都是跳过的。

未来还考虑支持一下知识库。

## 废弃
旧的版本需要一个后端、需要脚本转换，是我想复杂了。其实一个前端都能搞定。不过纯前端的话api需要代理一下，具体速度受限于你的服务器带宽。