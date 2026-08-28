# 历史：Terminal Complete

> [!CAUTION]
> **归档文档，不代表当前产品。** 当前用户界面不再把旧 Terminal / Phantom Shell 当作日常入口。现行 AI 使用方式请看 [../ai-management.md](../ai-management.md)。


LifeOS 终端是一个功能多样的工具，拥有两种模式：**AI Chat** 用于与 AI 模型对话，**Phantom Shell** 用于运行开发命令——全部完全在你的浏览器中运行。

---

## 目录

- [快速开始](#快速开始)
- [AI Chat 模式](#ai-chat-模式)
- [Phantom Shell 模式](#phantom-shell-模式)
- [快捷键](#快捷键)
- [故障排除](#故障排除)
- [术语表](#术语表)
- [相关指南](#相关指南)

---

## 快速开始

### 什么是终端

| 模式 | 用途 | 最适合 |
|------|------|--------|
| **AI Chat** | 与 AI 模型对话 | 提问、头脑风暴、编程求助 |
| **Phantom Shell** | 运行开发命令 | npm、node、构建项目 |

### 打开终端

- **键盘：** 按 `Ctrl+Shift+A`（Windows/Linux）或 `Cmd+Shift+A`（Mac）
- **点击：** 底部面板中的终端图标

### 你的第一次 AI 对话

1. 打开终端（默认进入 AI Chat 模式）
2. 输入你的问题并按 Enter
3. 即可看到 AI 实时作出回应

```
You: What's the best way to center a div in CSS?

AI: There are several modern approaches to center a div:

1. **Flexbox (recommended)**
   .container {
     display: flex;
     justify-content: center;
     align-items: center;
   }
...
```

### 你的第一条 Shell 命令

1. 点击 **Shell** 标签页，或在 AI Chat 中输入 `/shell`
2. 输入 `/version` 以启动运行时
3. 试试 `node -v` 查看 Node.js 版本

```
phantom:~$ /version
Phantom Shell v1.0.0
WebContainer: Ready
Node.js: v18.x

phantom:~$ node -v
v18.20.2
```

---

## AI Chat 模式

### 支持的提供商

LifeOS 支持 9 家 AI 提供商。其中一些可在浏览器中直接使用，另一些则需要代理。

| 提供商 | 浏览器直接访问 | 免费额度 | 推荐 |
|--------|----------------|----------|------|
| **OpenRouter** | 直接访问 | 是 | 新手首选——可使用 200 多个模型 |
| **HuggingFace** | 直接访问 | 是 | 极佳的免费选择 |
| **Anthropic** | 直接访问 | 否 | 质量最佳（Claude） |
| **Groq** | 受限 | 是 | 响应最快 |
| **Mistral** | 受限 | 是 | 来自欧洲的选项 |
| **Gemini** | 需要代理 | 是 | Google 的模型 |
| **OpenAI** | 需要代理 | 否 | GPT-4、ChatGPT |
| **xAI** | 需要代理 | 否 | Grok 系列模型 |
| **DeepSeek** | 需要代理 | 否 | 性价比出色 |

> **提示：** 标注为“需要代理”的提供商会阻止来自浏览器的直接请求。你可以使用 **OpenRouter** 在没有代理的情况下访问这些模型，或参阅[后端代理配置指南](./backend-proxy-setup.md)。

### 配置 API Key

1. 点击终端标题栏中的**齿轮图标**
2. 找到你想要使用的提供商
3. 点击 **Add API Key**
4. 粘贴你的 key，然后点击 **Save**
5. 点击 **Test** 进行验证

| 提供商 | Key 获取地址 | 免费额度 |
|--------|--------------|----------|
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | 赠送 $1 |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | 无 |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | 赠送 $5（新账户） |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | 免费额度充足 |
| HuggingFace | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | 免费 |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | 约 $5 免费额度 |
| Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | 提供免费额度 |

### 选择合适的模型

- **日常对话：** OpenRouter 的 Llama 3.3 70B（免费、快速）或 Anthropic Claude 3.5 Sonnet（质量最佳）
- **编程：** DeepSeek Coder（表现出色、价格低廉）或 Claude 3.5 Sonnet（综合最佳）
- **快速响应：** Groq 的 Llama 3.3 70B（速度极快）
- **复杂推理：** DeepSeek Reasoner（R1 模型）或 OpenAI o1（通过 OpenRouter 使用）

### 隐私与安全

你的 API key 在存储前会经过 AES-256 加密，仅保存在你的浏览器中，绝不会发送到 LifeOS 服务器，只会直接发送给你所选择的 AI 提供商。

---

## Phantom Shell 模式

### 什么是 Phantom Shell

Phantom Shell 是一个运行在你浏览器中的真实开发终端。它借助 WebContainer 技术直接运行 Node.js——无需安装任何东西。

### 支持与不支持的功能

| 可用 | 不可用 |
|------|--------|
| `npm install` | `git clone` |
| `npm run dev` | `docker` |
| `node script.js` | `python` |
| `npx create-react-app` | `ping` |
| `ls`、`cd`、`cat`、`mkdir` | `curl`、`wget` |

Phantom Shell 是在浏览器中运行 Node.js——它并不是一个完整的操作系统。首次启动需要 2～5 秒，之后便能即时就绪。

### 内置命令

| 命令 | 说明 |
|------|------|
| `/help` | 显示所有命令 |
| `/version` | 启动运行时并显示状态 |
| `/clear` | 清空终端屏幕 |
| `/history` | 显示命令历史记录 |
| `/projects` | 列出你的项目 |
| `/new <name>` | 创建新项目 |
| `/open <name>` | 打开一个项目 |
| `/close` | 关闭当前项目 |
| `/ai <prompt>` | 向 AI 寻求帮助 |

### 系统命令

启动完成后，即可运行标准的 Node.js 命令：

```bash
node -v              # Check Node version
npm init -y          # Create new project
npm install express  # Install packages
node index.js        # Run scripts
npm run dev          # Start dev server
ls -la               # List files
```

### AI 辅助命令

可以让 AI 帮你处理命令：

```bash
/ai create a react app with typescript
```

### 实时预览

当你运行开发服务器（`npm run dev`）时，预览面板会自动展示你的应用并实时更新。可通过终端标题栏中的分屏按钮开关预览。

### 项目

```bash
/new my-react-app    # Create project
/open my-react-app   # Open it
/projects            # List all projects
/close               # Close current project
```

项目会跨会话持久保存。

---

## 快捷键

### 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Shift + A` | 打开或关闭终端 |
| `Escape` | 关闭终端 |

### 终端快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 发送消息 / 运行命令 |
| `Up/Down` | 浏览命令历史记录 |
| `Ctrl + C` | 取消当前输入 |
| `Ctrl + L` | 清屏 |
| `Ctrl + Shift + F` | 在终端内搜索 |

### AI Chat 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 切换提供商/模型 |
| `Ctrl + N` | 新建会话 |

---

## 故障排除

### 无法使用 OpenAI/xAI/DeepSeek（提示“Proxy Required”）

改用 **OpenRouter**（它会替你代理请求），或使用 **Anthropic** 访问 Claude，也可以自行搭建代理（[参见指南](./backend-proxy-setup.md)）。

### 出现“WebContainer not ready”

先运行 `/version` 启动运行时（需要 2～5 秒）。

### ping/git/docker 无法使用

Phantom Shell 只支持 Node.js 命令。如需使用 git，请改用外部 git 客户端。

### 提示“API key invalid”

检查 key 的格式，前往提供商官网进行验证，确认 key 尚未过期，并查看剩余额度/配额。

### 提示“Rate limit exceeded”

等待几分钟后再试，换用其他提供商，或升级你的 API 套餐。

### 终端缓慢或无响应

运行 `/clear`，刷新页面，并检查浏览器控制台中的报错。支持的浏览器：Chrome 89+、Firefox 89+、Safari 16.4+。

---

## 术语表

| 术语 | 说明 |
|------|------|
| **CORS** | 浏览器限制跨域请求的安全机制。这正是部分提供商显示“Proxy Required”的原因。 |
| **WebContainer** | 基于 WebAssembly 的浏览器内 Node.js 运行时，无需本地安装即可运行真正的 npm/node 命令。 |
| **API Key** | 用于向 AI 提供商验证身份的保密字符串。请妥善保管，切勿泄露。 |
| **Streaming** | AI 回复边生成边实时送达，即流式输出。 |
| **Provider** | 通过 API 提供 AI 模型的公司（如 OpenAI、Anthropic 等）。 |
| **Model** | 提供商旗下的具体 AI 系统（如 GPT-4、Claude 3.5、Llama 3.3 等）。 |
| **Token** | AI 模型处理文本的基本单位，约 4 个字符 ≈ 1 个 token。 |
| **Context Window** | AI 模型在一次会话中能够“记住”的文本容量。 |

---

## 相关指南

- **[AI 指挥中心](./ai-management.md)**——当前的提供商配置与 AI 工作页面
- **[后端代理配置](./backend-proxy-setup.md)**——搭建你自己的代理服务器
- **[键盘快捷键](./keyboard-shortcuts.md)**——完整的快捷键参考
- **[隐私与安全](./privacy-security.md)**——你的数据如何受到保护
