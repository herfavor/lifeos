# LifeOS AI 架构（当前实现）

> 本文面向开发者，描述 `main` 当前实现，不是路线图。

## 入口

用户入口：`/ai`

核心组件与服务：

- `src/components/AI/AICommandCenter.tsx`
- `src/hooks/useAIRuntime.ts`
- `src/services/ai/agent/tools.ts`
- `src/services/ai/agent/actionParser.ts`
- `src/services/ai/agent/executor.ts`
- `src/services/ai/agent/promptBuilder.ts`
- `src/services/ai/agent/undo.ts`
- `src/stores/useAISettingsStore.ts`

## 工具协议

`AGENT_TOOLS` 当前注册 **60 个工具**。

只读工具自动执行并把结果注入下一轮；写工具按 execution mode 分派。

## Execution mode

```ts
type AIExecutionMode = 'ask' | 'auto' | 'readonly'
```

当前新用户默认：

```ts
executionMode: 'auto'
```

- `auto`：可撤销本地写操作直接执行
- `ask`：确认卡后执行
- `readonly`：阻断写操作

无论 mode 是否 auto，runtime 对以下工具强制确认：

```text
delete_task
delete_event
delete_note
delete_time_entry
delete_routine
```

## Action-first prompt

Prompt builder 明确要求：

- 优先只读查询消歧；
- 对可合理推断的时间 / 安排使用保守默认值；
- 可撤销操作优先执行；
- 只有真正高风险或仍无法消歧时追问；
- 不重复用户请求，不逐条播报同类系统日志。

## Store 是唯一真源

Executor 不维护第二套业务数据库。AI 写入调用现有 Zustand / Dexie 业务层，与人工 UI 共享持久化路径。

Undo 同样调用业务 API 做逆向恢复。

## Provider

当前 provider loader 实现 9 个 provider：

OpenRouter、Groq、Hugging Face、Mistral、Gemini、OpenAI、Anthropic、xAI、DeepSeek。

当前代码没有 Ollama provider。

## 上下文

- 今日快照：计数型摘要
- 跨模块上下文：显式开关
- API key：设备管理密钥加密，本地保存

## 文档同步要求

修改以下内容时必须同步更新用户文档：

- provider 列表
- execution mode 默认值
- destructive confirm 列表
- tool count / category
- AI 一级入口
- PWA / origin 隐私边界
