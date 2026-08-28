# LifeOS 品牌迁移与兼容性说明（BRANDING_MIGRATION）

本文件记录 NeumanOS → LifeOS 品牌重塑（第一阶段）中：

1. 哪些内容已完成用户可见层重塑；
2. 哪些**内部技术标识被有意保留**，以及原因；
3. 功能可见性（Feature Registry）的工作方式；
4. 默认仪表盘的迁移行为；
5. AI 的长期产品定位。

---

## 一、已完成的用户可见重塑

- 应用显示名 / 浏览器标题 / PWA 名称（`index.html`、`vite.config.ts`、`public/images/favicon/site.webmanifest`）
- Logo 与 favicon：`public/images/logos/lifeos-logo.svg`、`lifeos-logo-white.svg`、`lifeos-icon.svg`，以及全部 favicon/PWA PNG（可由 `scripts/generate-lifeos-brand-assets.py` 再生成）
- Sidebar / Header / Footer / Onboarding / PWA 安装提示 / About / 隐私与条款 / 帮助与支持
- AI 用户可见名称统一为「AI 指挥中心」（内部遗留类名 `AITerminal` 等保持不变）
- 导出文件名默认前缀改为 `LifeOS-*`（notes/tasks/calendar/time-entries/habits/export zip/diagnostics）
- 上游链接全部移除或替换为 `https://github.com/herfavor/lifeos`；移除了上游统计脚本（Cloudflare beacon）
- README 重写为 LifeOS 产品文档；新增 `NOTICE.md`；`LICENSE` 原样保留上游 MIT 版权声明

## 二、有意保留的历史内部标识

以下标识**与持久化数据或测试契约绑定**，为了不破坏既有用户的本地数据，本阶段不做修改（原则：UI 品牌可以立即改，持久化技术标识先保持兼容）：

| 标识 | 位置 | 说明 |
| --- | --- | --- |
| `'neumanos-db'` | `src/services/indexedDB.ts` | 主 IndexedDB 数据库名 |
| `'NeumanOSNotes'` / `'NeumanOSTasks'` / `'NeumanOSTimeTracking'` / `'NeumanOSInvoicing'` | `src/db/*.ts`、`useInvoicingStore` | Dexie 数据库名 |
| `'neumanos-diagrams'` | `useDiagramsStore` | Dexie 数据库名 |
| `'neumanos-file-handles'` | `src/services/backup/autoBackup.ts` | File System Access 句柄数据库 |
| `.neuman-backups/` | 自动备份版本文件夹 | 用户磁盘上的隐藏目录，改名会让旧版本历史"失踪" |
| `'neumanos-theme-vars'` | `src/config/themes/registry.ts` | 注入 `<style>` 的 DOM id（测试断言依赖） |
| `'neumanos-custom-accent'` | `AccentColorSection` | 同上，DOM id |
| `'neumanos-sr-announcer'` | `useAnnounce` | 屏幕阅读器公告节点 DOM id |
| `'AI Terminal'` 笔记夹名 (`AI_TERMINAL_FOLDER_NAME`) | `aiTerminalNotes.ts` | 已存在用户的笔记文件夹按名字匹配 |

若未来确需重命名以上任何一项，必须先实现向后兼容迁移（如 Dexie 版本化迁移、双名读取），并使用旧数据验证。

## 三、备份文件名的兼容策略

- 新建手动备份下载名：`LifeOS-Backup-*.brain`（原 `NeumanOS-Backup-*`）。
- 自动保存写入文件：`LifeOS-auto-*.brain`（原 `NeumanOS-auto-*`）。
- **清理逻辑同时识别新旧两种前缀**：旧版本写入的 `NeumanOS-auto-*` 文件仍参与保留数量管理，不会成为孤儿文件。
- 用户自定义备份文件名的偏好值原样尊重；代码内默认值改为 `LifeOS`。

## 四、Feature Registry（功能可见性）

位置：`src/config/features.ts`。

- `core`：首页、今天、收件箱、项目、任务、日程、笔记、收藏、回顾。
- `advanced`：AI 指挥中心、时间统计、番茄钟、专注模式、习惯、甘特图、知识图谱、自动化、每周回顾、项目组合、精力追踪、空闲时间、文档中心。入口在侧边栏「更多功能」面板。
- `hidden`：表格、演示文稿、绘图、表单、发票、计时报表、Quest/XP、闪卡等游戏化组件。**路由、组件、数据全部保留**，仅不再在主导航 / 默认布局 / 命令面板常用入口暴露；仍可通过 URL 直达。

改变某模块层级 = 只改该文件中的 `tier` 字段。侧边栏顺序存的是 feature id，未知 id 会被忽略，因此调整层级不会破坏已有用户的侧边栏数据。

其他配套调整：

- 任务页新增「收件箱」标签页（复用既有 `TriageInbox` 组件），作为核心收件箱入口；默认标签仍是任务看板。
- 侧边栏计时器常驻面板改为**紧凑指示器**（`ActiveTimerIndicator`）：仅在计时时出现，空闲时完全不占空间；完整的时间统计能力仍在 `/schedule?tab=timer`。旧面板 `TimeTrackingPanel.tsx` 源码保留未删除。

## 五、默认仪表盘迁移

- 全新安装默认不启用扩展组件；首页固定展示快速记录、今天、项目下一步与最近笔记。旧的 AI 建议/AI 新闻组件会在迁移时移除，AI 统一进入独立页面。天气地图（weathermap）仍可手动添加。
- 组件 store 版本 7 → 8：一次性从现有布局中移除 `weathermap`（用户可随时手动加回）；其余用户自定义布局不受影响。

## 六、AI 长期产品方向（记录）

LifeOS 的 AI 定位是**整理、规范、总结、建议**，不是单纯聊天机器人。未来方向示例：

- Inbox 自动分类建议
- 任务结构化
- 项目命名统一
- 重复内容识别
- 长期未推进项目提醒
- 收藏内容整理建议
- 每日/每周总结

行为原则：

```text
Observe → Understand → Suggest → User confirms → Execute
```

AI 不应默认静默大规模修改个人数据。系统提示词（`systemPrompts.ts` / `aiTerminal.ts` / `contextBuilder.ts`）已注入这一定位。
