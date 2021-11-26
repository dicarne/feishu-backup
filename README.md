# 飞书云文档备份

用于备份下载所有飞书云文档。下载下来是json格式。

须在`src/secret.ts`中配置`app_id`和`app_secret`，和配置路由生成函数，用于自定义路由前缀。

https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={{your_direct_url}}&app_id={{your_app_id}}

sudo docker build -t feishu-backup .

sudo docker run -d -p 3800:3800 --name="feishu" feishu-backup