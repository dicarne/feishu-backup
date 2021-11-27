# 飞书云文档备份（旧版）

用于备份下载所有飞书云文档。下载下来是json格式。

先在飞书开放平台创建应用，授予足够的权限：把云空间相关的都点上。

然后在`src/secret.ts`中配置`app_id`和`app_secret`（自己写），和配置路由生成函数`api`，用于自定义路由前缀。


启动备份的URL：中间需要替换你自己的重定向URL和APP_ID  
`https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={{your_direct_url}}&app_id={{your_app_id}}`

需要在飞书内打开这个链接，然后授权，等待下载。（目前暂时没有测试过文件很多的时候是否会崩溃）

## 部署
```bash
sudo docker build -t feishu-backup .

sudo docker run -d -p 3800:3800 --name="feishu" feishu-backup
```

## 转换
当然，一堆json是看不懂的。所以converter下的`main.py`承担了将json转换成markdown文件的重任。

它接受两个命令行参数，第一个是解压后的备份文件夹，第二个是输出文件夹。

会自动下载遇到的所有图片，可能不是所有格式都支持，欢迎反馈。为了节约网络，会跳过已经下载的id相同的图片，所以最好重复利用以前的生成文件夹。

## TODO
暂时只支持部分我需要的格式转换，所以很多格式都是跳过的。

未来还考虑支持一下知识库。