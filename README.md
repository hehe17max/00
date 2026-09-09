# PeripheralDB 1.0 正式版

一个面向键盘、鼠标、耳机/耳麦等外设的可联网产品数据库与静态查询网站。

当前初始数据：
- **262** 条产品记录
- **16** 个已配置/监控品牌
- 中国品牌 + 海外品牌
- GitHub Pages 静态网页
- GitHub Actions 自动发现与更新

## 正式版包含

### 查询与比较
- 品牌、品类、地区、核验状态筛选
- 针对鼠标 / 键盘 / 耳机分别使用不同参数提示和字段优先级
- 关键词 **单选 / 多选 AND / 多选 OR**
- `≤60g`、`≤35ms`、`100h+` 等结构化筛选
- 最多 **20 款产品**同时对比
- 产品详情、多来源、可信度与冲突显示
- 产品配图；无图片时自动显示分类占位图

### 每日自动更新
每天自动执行：
1. 搜索未知外设品牌
2. 验证疑似官网真实性
3. 高置信度品牌自动加入品牌库
4. 扫描已知品牌和新品牌的产品
5. 通过官网索引、Sitemap、Shopify Catalog 等方式发现遗漏新品
6. 补充官方图片与结构化规格
7. 滚动复核已有产品
8. 导入审核后的电商 / 第三方补充数据
9. 检查参数冲突
10. 校验数据库并自动部署 GitHub Pages

### 数据可信度
来源优先级：
`品牌官方产品页 > 官方支持/说明书 > 官方商城 > 官方旗舰店/授权电商 > 普通电商 > 专业测评 > 社区`

弱来源不会直接覆盖官方规格；冲突进入 `data/review_queue.json`。

## 快速安装

请直接阅读 **[INSTALL.md](INSTALL.md)**。

最简流程：

1. GitHub 创建公开仓库；
2. 上传本项目所有文件，特别是隐藏目录 `.github`；
3. `Settings → Pages → Source → GitHub Actions`；
4. `Actions → Deploy website to GitHub Pages` 确认绿色；
5. `Actions → Update peripheral product database → Run workflow` 手动运行第一次数据更新。

## 可选：稳定的自动品牌搜索

零配置时使用 DDGS 免费搜索兜底。

建议在 GitHub：
`Settings → Secrets and variables → Actions → New repository secret`

添加：

- `BRAVE_SEARCH_API_KEY`（推荐）
- 或 `SERPER_API_KEY`

程序自动按 `Brave → Serper → DDGS` 顺序选择。

## 日常维护

重点查看：

- `data/update_report.json`：每日产品更新报告
- `data/brand_discovery_report.json`：每日新品牌搜索报告
- `data/brand_candidates.json`：需要人工判断的品牌候选
- `data/review_queue.json`：规格冲突审核队列

候选品牌：
- `"status": "approved"` → 下一次任务正式纳入
- `"status": "rejected"` → 标记为拒绝
- `"status": "candidate"` → 保留等待审核

## 主要目录

```text
PeripheralDB/
├── index.html
├── app.js
├── style.css
├── assets/
├── data/
│   ├── products.json
│   ├── brands.json
│   ├── filter_schema.json
│   ├── source_policy.json
│   ├── brand_discovery_config.json
│   ├── brand_candidates.json
│   ├── brand_discovery_report.json
│   ├── review_queue.json
│   ├── update_report.json
│   └── import_queue.json
├── scripts/
│   ├── discover_brands.py
│   ├── update_data.py
│   ├── import_secondary.py
│   ├── validate_data.py
│   └── health_check.py
└── .github/workflows/
    ├── update.yml
    └── deploy-pages.yml
```

## 注意

自动化可以大幅减少漏收产品，但任何自动采集系统都无法保证覆盖互联网上 100% 的外设产品。对于动态官网、隐藏 API、微信商城或地区站，最好增加品牌专用解析器。

淘宝、天猫、京东、Amazon 等建议通过官方/授权 API、Feed 或人工审核后的结构化数据接入，不建议 GitHub Actions 无限制直爬商品页面。
