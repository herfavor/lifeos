# 参与贡献

感谢你参与 LifeOS。

## 环境

- Node.js 22（见 `.node-version`）
- npm

```bash
git clone https://github.com/YOUR_USERNAME/lifeos.git
cd lifeos
npm ci
npm run dev
```

## 分支与 PR

不要把长期开发直接堆在 `main`。

推荐分支名：

```text
feat/...
fix/...
refactor/...
docs/...
```

完成后：

1. 开 Pull Request；
2. 说明“为什么改 / 改了什么 / 如何验证”；
3. 等 CI 通过；
4. merge；
5. 删除已合并分支。

用户可见行为变化必须同步更新 README / `docs/*.md`。

## 提交前

```bash
npm run type-check
npm test -- --run
npm run build
npm run lint
npm run lint:design-tokens
```

`npm run test:browser:inventory` 可检查浏览器测试清单。

完整 Playwright 浏览器矩阵通过 GitHub Actions 的 **Hosted browser tests** 手动运行；不要把浏览器测试指向真实生产数据或真实账户。

## 代码约定

- TypeScript 严格模式
- Tailwind 使用现有语义 token
- Zustand 负责业务状态
- Dexie / IndexedDB 负责主要持久化
- Zod 用在 I/O 与 AI tool 参数边界
- AI executor 复用业务 store，不复制业务逻辑
- 新功能必须考虑 local-first、备份、迁移和回滚
- 不要通过第二入口重新暴露 `hidden` feature

## 文档约定

`README.md` 和 `docs/*.md` 属于用户文档，会被平台文档插件读取。

`docs/technical/*.md` 属于开发者文档，不进入普通应用文档中心。

历史审计文档必须标注“历史快照”，不能用旧设计描述当前产品。

## CI

`.github/workflows/ci.yml` 在 PR 与 main push 上执行：

- Node 22
- `npm ci`
- `npm run type-check`
- `npm test -- --run`
- `npm run build`

## Repository settings

推荐启用 main branch protection / ruleset，并打开 Automatically delete head branches。当前建议与检查结果见 [Repository governance](docs/technical/REPOSITORY_GOVERNANCE.md)。

## 许可证

贡献内容以 MIT License 发布。
