# PeripheralDB 1.0 安装与部署说明

本说明以 **GitHub Pages + GitHub Actions** 为推荐方案。你不需要购买服务器。

---

## 一、准备

你需要：

1. 一个 GitHub 账号；
2. `PeripheralDB_1.0_Official.zip`；
3. 浏览器。

解压 ZIP 后，你应该能看到：

```text
.github/
assets/
data/
scripts/
index.html
app.js
style.css
README.md
requirements.txt
.nojekyll
VERSION
```

**特别注意 `.github` 是隐藏目录。必须上传。**

---

## 二、创建 GitHub 仓库

1. 登录 GitHub。
2. 点击右上角 `+` → `New repository`。
3. Repository name 可以填写：
   `peripheral-db`
4. 建议选择 `Public`。
5. 点击 `Create repository`。

---

## 三、上传正式版

进入刚创建的仓库：

1. 点击 `Add file` → `Upload files`。
2. 将解压后的**项目内容**上传到仓库根目录。
3. 点击 `Commit changes`。

正确的仓库首页应该直接看到：

```text
.github/workflows
assets
data
scripts
index.html
app.js
style.css
```

### 错误示例

不要变成：

```text
peripheral-db/
  PeripheralDB_1.0_Official/
    index.html
```

也不要只上传 ZIP 文件。

---

## 四、确认 GitHub Actions 文件存在

在仓库首页点击：

`.github/workflows`

应该看到：

```text
deploy-pages.yml
update.yml
```

如果看不到，说明隐藏目录 `.github` 没上传成功。

---

## 五、启用 GitHub Pages

进入：

`Settings → Pages`

找到 `Build and deployment`。

将：

`Source`

选择为：

`GitHub Actions`

不需要选择 Jekyll 模板。

---

## 六、第一次部署网站

上传完成后点击仓库顶部：

`Actions`

左侧应该看到：

- `Deploy website to GitHub Pages`
- `Update peripheral product database`

先打开：

`Deploy website to GitHub Pages`

如果状态：

- 黄色圆点：正在运行
- 绿色 ✓：成功
- 红色 ×：失败

绿色后进入：

`Settings → Pages`

点击 `Visit site`。

如果你的用户名是 `abc`，仓库名为 `peripheral-db`，网址通常类似：

```text
https://abc.github.io/peripheral-db/
```

---

## 七、运行第一次自动更新

网站部署成功后：

1. 打开 `Actions`；
2. 选择 `Update peripheral product database`；
3. 点击右侧 `Run workflow`；
4. 分支选 `main`；
5. 再点击绿色 `Run workflow`。

第一次运行会依次执行：

```text
健康检查
→ 自动搜索新品牌
→ 审核候选品牌可信度
→ 导入补充来源
→ 扫描所有已知品牌新品
→ Sitemap / 官网 / Shopify Catalog 补漏
→ 补产品图
→ 复核已有规格
→ 参数冲突检测
→ 数据校验
→ 自动提交
→ 重新部署网站
```

---

## 八、如果自动更新无法提交数据

如果 Action 日志出现类似：

`403`
`Permission denied`
`Write access not granted`

进入：

`Settings → Actions → General`

向下找到：

`Workflow permissions`

如果你的仓库设置允许，选择：

`Read and write permissions`

保存后重新运行 Update workflow。

---

## 九、配置稳定的联网品牌搜索（推荐）

不配置任何 API Key 也可以运行，项目会使用 DDGS 作为免费搜索兜底。

但 GitHub Actions 的公共搜索请求可能偶尔限流。

### 推荐：Brave Search API

拿到 Brave Search API Key 后，在仓库进入：

`Settings → Secrets and variables → Actions`

点击：

`New repository secret`

Name：

```text
BRAVE_SEARCH_API_KEY
```

Secret：

填写你的 API Key。

保存即可。

不需要修改代码。

### Serper 备用

同样可以添加：

```text
SERPER_API_KEY
```

程序优先级：

```text
Brave Search
→ Serper
→ DDGS
```

---

## 十、每日自动更新时间

默认 GitHub Actions：

```yaml
cron: '20 2 * * *'
```

这是 UTC 时间，大约对应北京时间每天 **10:20**。

要修改时间，编辑：

`.github/workflows/update.yml`

例如北京时间 03:00 对应 UTC 前一天/当天约 19:00，使用 Cron 时需要注意 UTC 换算。

---

## 十一、如何检查系统有没有真的自动更新

查看：

### 产品更新报告

`data/update_report.json`

你会看到类似：

```json
{
  "date": "2026-09-10",
  "discovered": 8,
  "updated": 36,
  "images_added": 22,
  "rechecked": 120,
  "conflicts": 2
}
```

### 品牌发现报告

`data/brand_discovery_report.json`

记录：

- 搜索引擎
- 搜索结果数量
- 检查了几个疑似官网
- 新候选品牌
- 自动加入了几个品牌

### 品牌候选

`data/brand_candidates.json`

对可信但未达到自动加入阈值的品牌，可以手动修改：

```json
"status": "approved"
```

确认不是品牌则：

```json
"status": "rejected"
```

下一次任务会处理。

---

## 十二、参数冲突如何处理

打开：

`data/review_queue.json`

例如官网旧数据为：

```text
重量：54g
```

重新检查发现官网变成：

```text
重量：56g
```

系统不会悄悄覆盖，而是生成冲突记录供审核。

这可以避免不同版本、不同批次、地区版混在一起。

---

## 十三、如何补淘宝 / 天猫 / 京东 / Amazon / 测评数据

正式版不默认无限制直爬这些平台。

推荐：

1. 通过官方 API / 授权 Feed / 人工查证获得数据；
2. 写入 `data/import_queue.json`；
3. 下一次自动任务会运行 `scripts/import_secondary.py`。

第三方测评参数会保存为：

```text
第三方实测：点击延迟
第三方实测：重量
```

电商信息会保存为：

```text
电商信息：价格
电商信息：颜色
```

不会覆盖官网标称规格。

---

## 十四、升级正式版

以后收到新版 ZIP 时：

1. 先备份 GitHub 当前仓库；
2. 将新版代码文件覆盖上传；
3. **不要盲目覆盖自己已经积累的 `data/products.json` 和人工审核记录**；
4. 如果新版包含数据库结构升级，优先使用迁移脚本或让我基于你的线上仓库继续升级；
5. Commit 后 GitHub Pages 自动重新部署。

---

## 十五、常见问题

### Actions 页面显示 “Get started with GitHub Actions”

说明 `.github/workflows` 没有上传。

### 网站 404

检查：

- `index.html` 是否在仓库根目录；
- `Settings → Pages → Source` 是否为 `GitHub Actions`；
- Deploy workflow 是否绿色。

### 页面出来但没有产品

检查浏览器开发者工具以及：

`data/products.json`

是否存在。

### 图片缺失

部分品牌会阻止外站热链。系统会自动退回本地分类占位图。后续可增加官方图片缓存流程。

### 新品牌没被自动发现

可能原因：

- 搜索引擎未返回；
- 官网动态渲染；
- 官网产品 URL 不符合通用规则；
- Sitemap 不公开；
- 可信度未达到阈值。

先查看：

`data/brand_candidates.json`

和：

`data/brand_discovery_report.json`

对于重要品牌，最好增加品牌专用解析器。
