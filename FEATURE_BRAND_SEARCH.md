# 品牌搜索与联网补全

GitHub Actions → `Search and supplement a brand`

输入：
- `brand_name`：必填
- `official_url`：可选

例如：
```text
brand_name = VGN
official_url = https://...
```

运行后查看：
`data/brand_request_report.json`

可能状态：
- `existing_enriched`：已有品牌，补充了官网入口
- `added`：新品牌验证通过并加入
- `needs_review`：找到候选，但可信度不足
- `not_found`：未找到可信官网
