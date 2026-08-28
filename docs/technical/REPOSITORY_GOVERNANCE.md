# Repository governance

本文记录 LifeOS 推荐的仓库维护方式，并以当前 `main` 为准。

## 当前检查结果（2026-08-28）

- 默认分支：`main`
- `ux/2026-08-28-core-simplification`：已合并，不再承载未合并工作
- `ux/2026-08-28-polish-pass-2`：已合并，不再承载未合并工作
- `docs/2026-08-28-sync`：PR #5 已合并，不再承载未合并工作
- CI：Pull Request + `main` push 执行 type-check、unit test、production build
- Hosted browser tests：手动触发
- GitHub API 显示 `main` 当前 `protected: false`
- Rulesets：当前为空
- `delete_branch_on_merge`：当前为 `false`
- Issues / Discussions：当前仓库未启用
- 仓库当前同时允许 merge / squash / rebase

上述三个临时分支均已完成其工作，**可以安全删除**。之后建议保持“短生命周期分支”，不要长期保留已完成分支。

## 推荐设置

### main

建议开启 branch protection / ruleset：

- Require pull request before merging
- Require CI verify job
- 禁止 force push
- 禁止删除 `main`
- 是否要求 branch up to date，可按协作频率决定

如果主要由个人维护，也建议至少保留“PR + CI 后合并”的习惯，这样文档、测试和实现变化都有可回溯记录。

### 分支生命周期

```text
main
  └─ feat/... | fix/... | refactor/... | docs/...
       └─ PR
          └─ CI
             └─ merge
                └─ delete branch
```

短期分支合并后立即删除，不保留“已完成但永久存在”的 feature branch。

建议打开仓库设置里的 **Automatically delete head branches**。

### Merge strategy

仓库目前同时允许 merge / squash / rebase。

为了让 `main` 历史更简洁，普通功能 PR 推荐 **Squash merge**；只有确实需要保留分阶段提交历史的复杂重构再使用 merge commit。

### 文档与截图

任何用户可见行为改变必须同步更新：

- `README.md`
- 对应 `docs/*.md`
- 必要时 `docs/technical/*.md`
- 应用内平台文档排序 `config/vite-plugin-platform-docs.ts`

README 中展示的产品截图应来自**当前 `main` 实际运行界面**，存放在 `public/images/screenshots/`，不要长期引用已经与现状不一致的旧宣传图。

历史审计文档只保留历史快照，不继续当作当前产品说明。
