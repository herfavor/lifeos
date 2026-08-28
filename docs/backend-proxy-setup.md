# AI 后端代理

LifeOS 直接在浏览器 / PWA 中调用 AI provider。部分 provider 的官方接口不允许浏览器跨域直连，此时需要代理。

## 先看设置页提示

是否需要代理以当前代码的 provider metadata 为准。当前实现中：

- OpenRouter、Groq、Hugging Face、Mistral、Gemini、DeepSeek 标记为可直接从浏览器调用；
- OpenAI、Anthropic、xAI 标记为需要代理。

Provider 的 CORS 策略可能变化，因此不要把这张表当作第三方永久承诺。

## 最简单方案：OpenRouter

如果你只是想使用某个模型，而不是必须调用其原厂 API，OpenRouter 通常是浏览器端最省事的方案。

1. 获取 OpenRouter API key；
2. 在 **设置 → AI 提供商 → OpenRouter** 保存；
3. 选择 / 输入模型 ID。

## 自建代理的最低要求

代理至少应：

- 只允许你的 LifeOS origin；
- 只转发预期 provider host；
- 不记录 Authorization header；
- 使用 HTTPS；
- 有请求大小限制和速率限制；
- 不允许任意 URL 转发，避免成为开放代理。

本地开发时，如果同时使用 5173 和 4173，记得两者是不同 origin，需要分别列入 CORS allowlist。

## 密钥应该放在哪里

LifeOS 的现有 provider UI 设计为由客户端保存 API key。自建代理时不要把用户 key 写进公开前端代码。

如果改造成“服务器持有 key”的模式，那已经改变当前隐私模型，需要同时重写隐私文档与威胁模型。

## 当前没有官方代理服务

LifeOS 仓库没有附带正在托管的官方 AI proxy，也没有 LifeOS 账户后端。这里描述的是你自行部署时的安全边界。

## 相关指南

- [AI 管理](./ai-management.md)
- [隐私与安全](./privacy-security.md)
