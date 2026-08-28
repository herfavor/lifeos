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

## 分支与 Pull Request

不要把长期开发直接堆在 `main`。使用短生命周期分支，例如：

```text
feat/...
fix/...
refactor/...
docs/...
chore/...
```

每个 PR 应只解决一个明确问题，并说明：

- 为什么要改；
- 改了什么；
- 如何验证；
- 是否涉及数据迁移、用户文档或兼容性；
- 是否删除或替代了旧实现。

合并后删除已完成分支。普通功能 PR 推荐 squash merge。

## 提交前检查

```bash
npm run lint
npm run type-check
npm test -- --run
npm run lint:design-tokens
npm run test:browser:inventory
npm run build
```

完整 Playwright 浏览器矩阵通过 GitHub Actions 的 **Hosted browser tests** 手动运行；不要把浏览器测试指向真实生产数据或真实账户。

## 代码约定

- TypeScript 严格模式。
- Tailwind 使用现有语义 token。
- Zustand 负责业务状态；同一领域只保留一个状态真源。
- Dexie / IndexedDB 负责主要持久化。
- Zod 用在 I/O 与 AI tool 参数边界。
- AI executor 复用业务 store/service，不复制业务逻辑。
- 新功能必须考虑 local-first、备份、迁移和回滚。
- 不要通过第二入口重新暴露 `hidden` feature。
- 不在生产源码中保留 `Phase`、`Wave`、`P0/P1/P2`、parity 百分比等实施过程标记。
- 发现旧实现已被替代时优先删除，不新建 `archive` 目录保存副本。

## 文档约定

`README.md` 与普通 `docs/*.md` 是面向用户的当前文档；`docs/technical/*.md` 只保留长期有效的架构、兼容性和工程约束。

一次性审计、实施计划、阶段汇报、完成答卷、迁移进度、测试数量快照等内容放在 GitHub Issue / PR 中，不提交为长期 Markdown 文件。

用户可见行为、命令、配置、数据格式、隐私边界或部署方式发生变化时，更新对应的现有文档；内部重构不需要机械同步所有文档。

## CI

`.github/workflows/ci.yml` 在 PR 与 `main` push 上执行：

- `npm ci`
- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run lint:design-tokens`
- `npm run test:browser:inventory`
- `npm run build`

## Repository settings

推荐为 `main` 启用：

- Require pull request before merging；
- Require CI verify job；
- 禁止 force push；
- 禁止删除 `main`；
- Automatically delete head branches。

Repository 当前状态以 GitHub Settings 为准，不在仓库中维护日期化状态快照。

## 许可证

贡献内容以 MIT License 发布。
