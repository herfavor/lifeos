# AI 管理指南

LifeOS 的 AI 是一个**对话式管理入口**。它既可以正常聊天，也可以通过工具读写本地任务、日程、笔记等数据。

当前入口是侧栏一级导航 **AI**（`/ai`），不是“更多功能”里的次级页面。

## 两种模式

### 工具模式

用于管理 LifeOS 数据。当前代码注册了 **60 个工具**，覆盖：

- 任务与看板细节
- 日程
- 笔记
- 项目
- 收藏
- 自动化
- 习惯
- 精力
- 时间统计
- 专注
- 每日目标
- 例行
- 资源
- 任务模板

模型需要查询时会先用只读工具获取信息；写操作再按执行权限处理。

### 聊天模式

用于写作、分析、代码、翻译和普通问答。聊天模式不会把 JSON 或自然语言解析成 LifeOS 数据操作。

## 执行权限

执行权限保存在当前设备 / origin。

| 模式 | 当前行为 |
| --- | --- |
| 自动执行 | **新用户默认**。可撤销的本地写操作直接执行 |
| 每次确认 | 写操作先显示确认卡片 |
| 只读 | 只允许查询工具 |

自动执行不意味着静默删除。以下删除工具在 runtime 中被强制要求确认：

- `delete_task`
- `delete_event`
- `delete_note`
- `delete_time_entry`
- `delete_routine`

## 少追问策略

当前 Agent 提示词要求：

1. 能用只读查询消歧时，先自己查；
2. “明天下午”“安排能安排的”这类可合理推断的表达，优先采用保守默认值；
3. 对可撤销操作优先执行，再允许用户撤销 / 修改；
4. 只有永久删除、不可逆覆盖、外部不可逆行为，或查询后仍有多个同等可能目标时才追问；
5. 多个同类动作合并成结果摘要，不逐条播报过程日志。

## 操作记录与撤销

工具写操作成功后进入 AI 操作记录。记录可以包含：

- 工具与摘要
- 自动执行 / 用户确认来源
- 成功或失败
- 结果页面跳转
- 撤销入口

撤销仍复用业务 store，不维护第二套 AI 数据。

## 当前提供商

代码实现 9 个 provider：

- OpenRouter
- Groq
- Hugging Face
- Mistral AI
- Google Gemini
- OpenAI
- Anthropic
- xAI (Grok)
- DeepSeek

在 **设置 → AI 提供商** 中填写 API key 和模型 ID。API key 使用设备管理密钥加密后保存在本地。

部分 provider 因浏览器 CORS 策略需要代理；以设置页当前提示为准。

> 当前代码没有 Ollama provider。旧版 AI Terminal / Ollama 文档不再代表 `main` 当前实现。

## 上下文与隐私

- 今日快照是计数型摘要；
- 跨模块上下文由用户显式开启；
- 开启后，相关任务、日程、笔记等内容会随 prompt 发往当前所选 AI provider；
- LifeOS 没有聊天中转服务器。

## 快捷键

- Windows / Linux：`Ctrl + Shift + A`
- macOS：`Cmd + Shift + A`

## 相关指南

- [后端代理](./backend-proxy-setup.md)
- [隐私与安全](./privacy-security.md)
- [键盘快捷键](./keyboard-shortcuts.md)
- [AI 架构（开发者）](./technical/AI_ARCHITECTURE.md)
