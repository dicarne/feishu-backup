## 飞书云文档备份

用于备份下载所有飞书云文档。

先在飞书开放平台创建应用，授予足够的权限：把云文档相关的都点上。

记住`app_id`和`app_secret`，构造url: `https://{{your_server}}/tool/feishu-backup/{{app_id}}/{{app_secret}}`。在飞书应用后台的安全设置中的重定向中写入这个url。

把这个url encode后，作为`{{your_direct_url}}`。

启动备份的URL：中间需要替换你自己的重定向URL和APP_ID
`https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={{your_direct_url}}&app_id={{app_id}}`

打开这个链接，然后授权，点击按钮，等待下载。

## 部署
`feishu-backup-web`下

创建`secret.ts`，导出`baseUrl`和`baseUrl_noauth`两个url作为飞书api的代理，一个接收有auth头的请求，一个接受没有auth头的请求。可以用你自己服务器代理，也可以用别的。我用的是腾讯云API网关，还挺好用。url应该代理到`https://open.feishu.cn/open-apis`。

```
pnpm i
pnpm run build
```

然后把`dist`下的生成文件放到你的网页文件夹中。

默认是有一段前缀路由的：`/tool/feishu-backup/api/`，所以请求形如`https://your_domain/tool/feishu-backup/api/#/...`。注意需要在`nginx`中配置一下，或者自己改一下路由。

## TODO
暂时只支持部分我需要的格式转换，所以很多格式都是跳过的。
可以修改`src/components/converter.ts`（飞书1.0doc）和`src/components/convert_docx.ts`（飞书2.0docx）支持你想要的块。

## 注意
这是为个人用户设计，你必须要有飞书的管理员权限才行。否则API无法获取你的文档。

## 更新
- 支持飞书2.0 docx（不完全）
  - 多级标题
  - 加粗、斜体
  - 代码块
  - 公式块
  - 引用
  - 图片
- 增加一个看得过去的ui界面。
- 知识库已支持。
