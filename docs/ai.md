# AI

LifeOS 的 AI 是一个对话式管理入口：既可以正常聊天，也可以通过工具读取和操作本地任务、日程、笔记等数据。

入口：侧栏一级导航 **AI**（`/ai`）。

## 两种模式

### 工具模式

用于管理 LifeOS 数据。工具覆盖任务、日程、笔记、项目、收藏、自动化、习惯、精力、时间统计、专注、每日目标、例行、资源和任务模板等领域。

查询优先使用只读工具；写操作按当前执行权限处理。AI executor 必须复用业务 Store/Service，不能维护第二套业务逻辑。

### 聊天模式

用于写作、分析、代码、翻译和普通问答。聊天模式不会把普通自然语言自动解析成 LifeOS 数据写操作。

## 执行权限

| 模式 | 行为 |
| --- | --- |
| 自动执行 | 新用户默认。可撤销的本地写操作直接执行 |
| 每次确认 | 写操作先显示确认卡片 |
| 只读 | 只允许查询工具 |

自动执行不等于静默删除。删除任务、事件、笔记、时间记录和例行等高风险工具在 runtime 中仍强制确认。

写操作成功后会进入 AI 操作记录；支持的操作可查看结果并撤销。

## 少追问原则

AI 的行为目标是：

1. 能用只读查询消歧时先自己查；
2. 对“明天下午”“安排能安排的”这类可合理推断的表达采用保守默认值；
3. 可撤销操作优先执行，再允许撤销/修改；
4. 永久删除、不可逆覆盖、外部不可逆行为或无法消歧时才追问；
5. 多个同类动作合并成结果摘要，不逐条播报过程日志。

## 提供商与隐私

当前实现包括 OpenRouter、Groq、Hugging Face、Mistral AI、Google Gemini、OpenAI、Anthropic、xAI 和 DeepSeek。

在 **设置 → AI 提供商** 中填写 API key 和模型 ID。API key 使用设备管理密钥加密后保存在本地。

跨模块上下文由用户显式开启。开启后，相关任务、日程、笔记等内容会随 prompt 发往当前选择的 provider。LifeOS 没有聊天中转服务器。

当前代码没有 Ollama provider。

## 浏览器 CORS 与代理

部分 provider 不允许浏览器直接跨域请求。是否需要代理以当前设置页 provider metadata 为准；第三方策略可能变化。

如果只是想使用某个模型而不要求原厂 API，OpenRouter 通常是浏览器端更简单的选择。

需要自建代理时，最低安全要求：

- 只允许你的 LifeOS origin；
- 只转发预期 provider host；
- 不记录 Authorization header；
- 使用 HTTPS；
- 限制请求大小和速率；
- 禁止任意 URL 转发，避免变成开放代理。

`http://localhost:5173` 与 `http://localhost:4173` 是不同 origin，需要分别配置 CORS allowlist。

LifeOS 仓库没有附带正在托管的官方 AI proxy，也没有 LifeOS 账户后端。若改成“服务器持有 key”，就已经改变当前隐私模型，需要同步修改隐私文档和威胁模型。

## 快捷键

- Windows / Linux：`Ctrl + Shift + A`
- macOS：`Cmd + Shift + A`

## 相关指南

- [隐私与安全](./privacy-security.md)
- [键盘快捷键](./keyboard-shortcuts.md)
- [自动化](./automation.md)
- [AI 架构（开发者）](./technical/AI_ARCHITECTURE.md)
