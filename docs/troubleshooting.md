# 故障排除

## PWA 没有“安装”按钮

先确认你不是在开发模式测试：

```bash
npm run build
npm run preview
```

然后打开 `http://localhost:4173`。Chrome / Edge 可能只在地址栏或菜单中显示“安装 LifeOS”，不一定弹窗。

Vite 配置明确关闭了开发模式 Service Worker。

## 安装后的 PWA 打不开 / 刷新失败

如果 PWA 安装自 `localhost:4173`，确认本地服务器仍在运行。

关闭普通浏览器标签页没有关系，但停止 `npm run preview` 后，不应依赖 Service Worker 缓存长期替代 origin 服务。

## 5173 有数据，4173 没数据

这是正常的浏览器 origin 隔离。

先在 5173 导出 `.brain`，再到 4173 导入。不要通过复制浏览器内部 IndexedDB 文件迁移。

## AI 提示“未配置提供商”

进入 **设置 → AI 提供商**：

1. 展开一个 provider；
2. 填 API key；
3. 模型 ID 可留空使用默认值，或自行填写；
4. 保存并启用。

## AI 请求出现 CORS / Failed to fetch

不同 provider 的浏览器策略不同。以设置页 provider metadata 的“需代理”提示为准。

优先尝试 OpenRouter；需要原生 provider 时再参考 [后端代理](./backend-proxy-setup.md)。

## AI 为什么没有每次问我

新用户默认执行权限是 **自动执行**。可撤销的本地操作会直接执行。

如果你希望每次确认，切换成“每次确认”；如果只想查询，切换成“只读”。

删除任务、事件、笔记、时间记录和例行即使在自动执行模式仍会确认。

## 收件箱项目为什么没出现在任务看板

这是当前设计。

`backlog` 属于收件箱，正式任务页有意隐藏 backlog 列。处理后点击“安排”才会进入任务流。

## 备份 / 数据恢复

遇到任何可能影响数据的问题，先：

1. 停止继续写入；
2. 导出当前 `.brain`；
3. 再尝试刷新、迁移或重置设置。

清除站点数据会删除 IndexedDB、localStorage、API key 设备密钥和 PWA 相关存储。

## 自动备份文件夹不可选

File System Access API 主要由 Chromium 系浏览器支持。Firefox / Safari 兼容性不同；不支持时使用手动 `.brain` 导出。

## 构建失败

仓库当前 Node 版本是 22：

```bash
node -v
npm ci
npm run type-check
npm test -- --run
npm run build
```

## 浏览器测试

完整 Playwright 浏览器矩阵不要求本机跑。仓库提供 GitHub Actions 的 **Hosted browser tests** 手动工作流。

## 相关指南

- [PWA 安装](./install-pwa.md)
- [备份与恢复](./backup-sync.md)
- [AI 管理](./ai-management.md)
