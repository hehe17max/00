# 部署检查清单

上传后逐项确认：

- [ ] 仓库根目录存在 `index.html`
- [ ] 仓库存在 `.github/workflows/deploy-pages.yml`
- [ ] 仓库存在 `.github/workflows/update.yml`
- [ ] `Settings → Pages → Source` 已选择 `GitHub Actions`
- [ ] `Deploy website to GitHub Pages` 为绿色
- [ ] 网站可以访问
- [ ] `Update peripheral product database` 可以手动运行
- [ ] `data/update_report.json` 在运行后有新日期
- [ ] `data/brand_discovery_report.json` 在运行后有新日期
- [ ] 如果自动提交报 403，检查 Actions 的 Workflow permissions
- [ ] （推荐）已配置 `BRAVE_SEARCH_API_KEY`
