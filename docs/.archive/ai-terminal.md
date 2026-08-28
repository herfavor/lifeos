# 历史：AI Terminal

> [!CAUTION]
> **归档文档，不代表当前产品。** 当前 AI 入口、执行权限和 provider 说明请看 [../ai-management.md](../ai-management.md)。本文件仅用于追溯旧版 AI Terminal 体验。


> 该界面已从普通导航与全局布局中移除。当前唯一 AI 入口是「更多功能」中的 [AI 指挥中心](./ai-management.md)，提供商请在“设置 → AI 提供商”中配置。本页只保留旧数据结构与迁移参考。

AI 终端（AI Terminal）让你可以接入 9 家不同的 AI 提供商，并支持自动回退与加密的密钥存储。无论是编程、答疑、头脑风暴还是其他需求，都可以在这里获得帮助——一切由你自己的 API key 驱动，完全在你的浏览器中运行。

---

## 目录

- [快速开始](#快速开始)
- [选择提供商](#选择提供商)
- [了解代理需求](#了解代理需求)
- [获取 API Key](#获取-api-key)
- [了解模型](#了解模型)
- [使用 AI 终端](#使用-ai-终端)
- [高级功能](#高级功能)
- [加密与安全](#加密与安全)
- [技巧与最佳实践](#技巧与最佳实践)
- [故障排除](#故障排除)
- [常见问题](#常见问题)
- [相关指南](#相关指南)

---

## 快速开始

### 步骤 1：打开 AI Terminal

点击屏幕右下角的 **AI Terminal** 按钮，或按 **Ctrl+Shift+A** / **Cmd+Shift+A**。

### 步骤 2：配置提供商

1. 点击终端顶部的 **设置** 按钮
2. 选择一个提供商（推荐方案见下文）
3. 在该提供商的网站上获取 API key
4. 输入你的 API key，然后点击 **保存**
5. 点击 **测试密钥** 验证其可用
6. 点击 **完成** 关闭设置

### 步骤 3：开始对话

输入你的问题或请求并按 Enter，AI 会实时作出回应。

---

## 选择提供商

| 提供商 | 免费额度 | 付费价格 | 需要信用卡 | 最适合 |
|--------|----------|----------|------------|--------|
| **OpenRouter** | 大量免费模型 | $0.06--$30/1M tokens | 否 | 通用性最强 |
| **Groq** | 慷慨的免费额度 | N/A（仅免费） | 否 | 速度最快 |
| **HuggingFace** | 真正的免费额度 | N/A（仅免费） | 否 | 开源生态 |
| **Mistral** | 有限的免费额度 | $0.25--$2/1M tokens | 是 | 欧洲 / GDPR |
| **Gemini** | 有免费额度 | $0.075--$1.25/1M tokens | 是 | 大上下文 |
| **OpenAI** | 无 | $0.15--$15/1M tokens | 是 | GPT-4o、o1 |
| **Anthropic** | 无 | $1--$15/1M tokens | 是 | 质量最佳 |
| **xAI** | 无 | ~$5/1M tokens | 是 | 实时信息 |
| **DeepSeek** | 有限的免费额度 | ~$0.14--$2.19/1M tokens | 是 | 高性价比推理 |

> **提示：** 建议从 OpenRouter 或 Groq 开始——两者都免费，且无需信用卡。

---

## 了解代理需求

你可能会看到某些提供商旁边带有 **需要代理（Proxy Required）** 徽标。出于隐私考虑，LifeOS 完全在你的浏览器中运行——你的 API key 永远不会经过我们的服务器。不过，受 CORS 安全策略限制，部分 AI 提供商会阻止来自浏览器的直接请求。

| 提供商 | 浏览器访问 | 状态 |
|--------|------------|------|
| **OpenRouter** | 直连 | 可在浏览器中使用 |
| **Anthropic** | 直连 | 可在浏览器中使用 |
| **HuggingFace** | 直连 | 可在浏览器中使用 |
| **Groq** | 受限 | 通常可用 |
| **Mistral** | 受限 | 通常可用 |
| **OpenAI** | 被阻止 | 需要代理 |
| **xAI (Grok)** | 被阻止 | 需要代理 |
| **DeepSeek** | 被阻止 | 需要代理 |
| **Gemini** | 被阻止 | 需要代理 |

### 解决方案（由易到难）

**1. 使用 OpenRouter（推荐）** —— 只需一个 API key 即可访问 GPT-4o、Claude、Llama 等 200 多个模型，并且可以在浏览器中直连。提供免费额度。

**2. 使用 Anthropic 访问 Claude** —— Claude 模型可在浏览器中直连，写作与分析质量最佳。

**3. 自建代理（进阶）** —— 参见 [后端代理搭建指南](./backend-proxy-setup.md)。

---

## 获取 API Key

### 免费提供商

#### OpenRouter

通过一个 API 访问 200 多个模型（包括 GPT-4o、Claude、Llama），其中许多模型可免费使用。

1. 访问 [openrouter.ai](https://openrouter.ai)
2. 使用 Google/GitHub/邮箱登录
3. 前往 [openrouter.ai/keys](https://openrouter.ai/keys)
4. 点击 **Create Key** 并为其命名
5. 复制 API key（以 `sk-or-v1-...` 开头）
6. 粘贴到 LifeOS 的 AI 终端设置中

**免费模型：** Llama 3.3 70B、Gemini 2.0 Flash Thinking、Mistral 7B、Qwen 2.5 72B

#### Groq

目前最快的 AI 推理服务，100% 免费。

1. 访问 [console.groq.com](https://console.groq.com)
2. 使用 Google 或邮箱注册
3. 点击 **API Keys** > **Create API Key**
4. 复制密钥（以 `gsk_...` 开头）
5. 粘贴到 LifeOS 设置中

**免费模型：** Llama 3.3 70B、Llama 3.1 8B、Mixtral 8x7B、Gemma 2 9B。速率限制：每分钟 30 次请求，每天 14,400 次。

#### HuggingFace

数千个开源模型，真正的免费额度。

1. 访问 [huggingface.co/join](https://huggingface.co/join)
2. 注册并验证邮箱
3. 前往 [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. 点击 **New token** 并授予 **Read** 权限
5. 复制令牌（以 `hf_...` 开头）
6. 粘贴到 LifeOS 设置中

#### Mistral

欧洲 AI 公司，对 GDPR 友好。

1. 访问 [console.mistral.ai](https://console.mistral.ai)
2. 注册并验证邮箱
3. 前往 [console.mistral.ai/api-keys/](https://console.mistral.ai/api-keys/)
4. 点击 **Create new key**
5. 复制并粘贴到 LifeOS 设置中

### 付费提供商

#### Google Gemini

高达 1M token 的超大上下文窗口，支持多模态（文本 + 图片）。

1. 访问 [aistudio.google.com](https://aistudio.google.com)
2. 使用 Google 账号登录
3. 点击 **Get API key** > **Create API key**
4. 复制密钥（以 `AIza...` 开头）

#### OpenAI

提供 GPT-4o 和 o1 模型。浏览器直连需要代理——想最省事请改用 OpenRouter。

1. 访问 [platform.openai.com/signup](https://platform.openai.com/signup)
2. 注册并添加支付方式
3. 前往 [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. 点击 **Create new secret key**
5. 立即复制（之后无法再次查看）

#### Anthropic Claude

写作、分析、编程方面的回答质量最佳，可在浏览器中直连。

1. 访问 [console.anthropic.com](https://console.anthropic.com)
2. 注册并添加支付方式
3. 前往 [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
4. 点击 **Create Key**
5. 复制密钥（以 `sk-ant-...` 开头）

#### xAI Grok

个性鲜明，可获取实时信息。需要代理。

1. 访问 [console.x.ai](https://console.x.ai)
2. 使用 X 账号登录
3. 创建 API Key
4. 复制并粘贴到 LifeOS 设置中

#### DeepSeek

高性价比的推理与编程模型。浏览器直连需要代理。

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册并验证账号
3. 进入 API Keys 版块
4. 创建新的 API key
5. 复制并粘贴到 LifeOS 设置中

**模型：** DeepSeek-V3（通用）、DeepSeek-R1（推理）。以低成本的出色编程表现著称。

---

## 了解模型

### 如何选择合适的模型

| 任务类型 | 最佳免费模型 | 最佳付费模型 |
|----------|--------------|--------------|
| 代码生成 | Llama 3.3 70B（OpenRouter） | GPT-4o |
| 代码调试 | Llama 3.3 70B（Groq） | Claude 3.5 Sonnet |
| 写作与编辑 | Llama 3.3 70B（OpenRouter） | Claude 3.5 Sonnet |
| 研究与分析 | Qwen 2.5 72B（OpenRouter） | o1 |
| 快速问答 | Gemini Flash（OpenRouter） | Claude 3.5 Haiku |
| 头脑风暴 | Mixtral 8x7B（Groq） | GPT-4o |
| 数学与逻辑 | Llama 3.3 70B（Groq） | o1 |
| 多语言 | Qwen 2.5 72B（OpenRouter） | Gemini Pro |
| 长上下文 | Gemini Flash（免费额度） | Gemini Pro |

**成本优化策略：**
1. **日常免费使用：** 一律使用 OpenRouter 的 Llama 3.3 70B
2. **追求速度：** 改用 Groq 的 Llama 3.3 70B（同一个模型，速度快得多）
3. **复杂推理：** 只在必要时升级到 Claude 3.5 Sonnet 或 o1
4. **超长上下文：** 使用 Gemini Flash 免费额度（1M tokens）

---

## 使用 AI 终端

### 基础对话

输入你的问题，然后按 Enter。例如：

```
What's the difference between React and Vue?

Write a function to validate email addresses in JavaScript

Help me debug this error: "Cannot read property 'map' of undefined"
```

### 多行输入

- 按 **Shift+Enter** 换行
- 单独按 **Enter** 发送消息

### 清空对话

点击垃圾桶图标按钮即可清空聊天记录。

### 流式输出

所有提供商都支持流式输出（o1 模型除外），因此你能看到回复实时出现。

---

## 高级功能

### 语音输入

点击 AI Terminal 输入栏中的麦克风图标，即可借助浏览器内置的语音识别口述消息。语音输入完全在你的浏览器内处理——不会向 LifeOS 服务器发送任何音频。支持 Chrome、Edge 和 Safari。

### 跨模块上下文

AI 终端可以读取其他 LifeOS 模块中的上下文，从而给出更贴合的回答。启用后，AI 可以引用：

- **笔记** —— 你最近的笔记及其内容
- **任务** —— 你的任务看板、状态和截止日期
- **日历** —— 即将到来的事件和日程安排
- **习惯** —— 你的习惯连续打卡记录与追踪数据

在 AI 终端的 **设置 > 上下文** 中开启或关闭跨模块上下文。启用后，相关数据会包含进你发送给 AI 提供商的提示词（prompt）中。这些数据会被发送到你当前选定的 AI 提供商，因此请只对你信任的提供商启用此功能。

### 自然语言操作栏

AI 终端支持自然语言操作栏。无需在界面间来回导航，你可以直接输入自然语言指令，例如：

- “创建一个名为『Review PR』的任务，周五截止”
- “我明天的日历上有什么安排？”
- “总结一下我这周的笔记”
- “开始一次 25 分钟的专注时段”

AI 会理解你的意图，并在 LifeOS 内执行相应操作。

### 使用 Ollama 本地运行 AI

如果想要完全离线、私密的 AI，你可以把 LifeOS 连接到本机运行的本地 Ollama 实例。这样所有 AI 对话都完全保留在你的设备上——不经任何网络传输。

1. 在电脑上安装 [Ollama](https://ollama.com)
2. 拉取一个模型（例如 `ollama pull llama3.1`）
3. 启动 Ollama（`ollama serve`）
4. 在 LifeOS 的 AI 终端设置中选择 **Ollama** 作为提供商
5. 输入本地 URL（默认：`http://localhost:11434`）

Ollama 支持数十个开源模型，包括 Llama 3、Mistral、CodeLlama 和 Phi。所有处理都在你自己的硬件上完成。

### 模型选择

点击 **模型选择器** 即可浏览可用模型，按提供商/用途/免费/付费筛选，并比较速度、质量、上下文与成本。

### 用量统计

点击 **用量统计** 即可查看各提供商的请求次数、预估 token 用量、成本估算以及时间范围筛选。

### 自动回退

如果主提供商不可用（速率限制、配额耗尽、网络错误），系统会自动改用备用提供商。你会看到类似这样的通知：“openrouter 失败：请求频率超限，已切换到 groq。”

回退顺序：OpenRouter > Groq > HuggingFace > Mistral > Gemini。

### 提供商信息

每条消息都会显示所使用的提供商和模型：

```
[Assistant Response]
12:34 PM -- openrouter -- llama-3.3-70b
```

---

## 加密与安全

### 无需密码的本地加密

你的 API key 使用 AES-256 加密存储，**全程不需要设置或输入密码**：

```
Your API Key
    |
Encrypted with device key (AES-256)   ← 首次保存时自动生成的本机随机密钥
    |
Stored in browser (encrypted)
    |
Decrypted when needed (in memory only)
```

**你的 API key 绝不会：**
- 发送到我们的服务器
- 以明文形式存储
- 与任何人共享

**设备密钥绝不会：**
- 通过网络发送
- 离开这台浏览器

> 提示：清除浏览器站点数据会同时删除设备密钥与已存密钥，重新填写即可恢复使用。

### 配置与管理

打开 **设置 → AI 提供商**：
1. 在对应行粘贴 API key
2. 模型 ID 可自行填写（输入框会提供该提供商的模型建议），留空则用默认模型
3. 点「保存并启用」立即生效；刷新页面后依然有效
4. 不想用了点「删除配置」，密钥即被彻底移除

### 备份注意事项

`.brain` 导出文件默认不包含 API 密钥。

---

## 技巧与最佳实践

### 获得更好的结果

- **表述具体：** 比如“编写一个从 API 获取数据并用表格展示的 React 组件”，而不是“帮我看看代码”
- **提供上下文：** 附上错误信息，说明你已经尝试过什么，分享相关代码片段
- **选对模型：** 快速问答用高速模型，复杂推理用高质量模型

### 控制成本

- 优先使用免费提供商——OpenRouter、Groq 和 HuggingFace 都非常出色
- 通过用量统计监控使用情况
- 简单任务用更便宜的模型，只在必要时使用高质量模型

### 安全

1. 定期检查已配置的提供商，删除不再使用的配置
2. 不要共享启用了加密密钥的 `.brain` 文件
3. 每隔几个月轮换一次 API key
4. 在提供商的控制台上关注 API 用量
5. 在提供商支持的情况下，于其控制台中设置消费限额

---

## 故障排除

### "Provider not configured"（未配置提供商）
打开设置，找到对应提供商，添加你的 API key，保存并测试。

### "Invalid API key"（API key 无效）
检查密钥格式是否符合对应提供商的要求（例如 OpenRouter 以 `sk-or-v1-` 开头，Groq 以 `gsk_` 开头）。仔细复制粘贴，并在提供商控制台确认密钥仍然有效。

### "API key 无法解密"
多为清除了部分浏览器数据导致设备密钥丢失。到 **设置 → AI 提供商** 重新粘贴该提供商的 API key 即可，LifeOS 会自动清理无法解密的旧记录。

### "Rate limit exceeded"（超出速率限制）
等待限制重置（视提供商而定，从 1 分钟到 24 小时不等）。自动回退会切换到其他提供商。建议配置多个提供商以保证冗余。

### "CORS error"（CORS 错误）（OpenAI、xAI）
改用 OpenRouter（可访问相同的模型，且能在浏览器中使用），或使用 Anthropic 访问 Claude。更多进阶方案参见 [后端代理搭建指南](./backend-proxy-setup.md)。

### 响应缓慢
切换到更快的模型（Groq 的响应时间不到 1 秒）。清空聊天记录（上下文越短，响应越快）。也可以换一个提供商试试。

### "Network error" 或 "Failed to fetch"（网络错误或请求失败）
检查网络连接，查看提供商状态页，暂时禁用 VPN，或换一个浏览器试试。

---

## 常见问题

**我的数据私密吗？** 私密。聊天记录仅存储在你的浏览器本地。API key 经过加密。没有云存储，也没有服务器追踪。

**可以同时使用多个提供商吗？** 可以。你可以随意配置任意多个提供商。系统同一时间只使用其中一个，但在需要时会自动回退。

**忘记密码怎么办？** 现在没有密码了。若密钥读取异常（例如清除了浏览器数据），到设置里重新粘贴一次即可。

**哪个提供商最好？** 免费首选：OpenRouter（最全能）或 Groq（最快）。付费首选：Claude 3.5 Sonnet（质量最佳）或 GPT-4o（最流行）。

**必须付费吗？** 不必。OpenRouter、Groq、HuggingFace 和 Mistral 都提供免费额度。

**付费提供商要花多少钱？** 通常为每 100 万 token $0.15--$15。一次普通对话大约消耗 500--2000 个 token，因此 1 美元足够进行数百次对话。

---

## 相关指南

- **[Terminal 完整指南](./terminal-complete.md)** —— AI Chat 与 Phantom Shell 模式
- **[后端代理搭建](./backend-proxy-setup.md)** —— 为被阻止的提供商搭建自己的代理
- **[隐私与安全](./privacy-security.md)** —— 你的数据如何受到保护
- **[键盘快捷键](./keyboard-shortcuts.md)** —— 终端快捷键
