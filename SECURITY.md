# 安全策略

## 受支持版本

当前仓库版本见 `package.json`。安全修复以最新 `main` 和最新发布版本为准；历史版本不保证继续接收修复。

## 报告漏洞

请使用 GitHub Private Vulnerability Reporting：

https://github.com/herfavor/lifeos/security/advisories/new

建议包含：

- 漏洞描述
- 复现步骤
- 潜在影响
- 浏览器 / 操作系统
- 建议修复（可选）

不要在公开 PR、README 或截图中提交真实 API key、备份文件或个人数据。

## 当前安全模型

LifeOS 是 local-first Web / PWA：

- 没有 LifeOS 账户系统；
- 没有 LifeOS 业务数据托管后端；
- 主要业务数据保存在当前 origin 的 IndexedDB；
- 部分 UI 配置保存在 localStorage；
- AI、天气、外部资源等能力只有在用户主动使用时才联网；
- `.brain` 备份默认不包含 AI API key。

## AI API key

Provider API key 使用设备管理的本地随机 secret 加密保存。

当前实现链路：

```text
device random secret
  → PBKDF2-SHA-256 (600,000 iterations)
  → AES-256-GCM
  → encrypted provider key in local storage
```

设备 secret 本身保存在当前浏览器 origin 的 localStorage。这个设计用于避免 API key 以明文落盘和防止简单存储检查，**不用于防御已经完全攻陷设备、浏览器 profile 或同源 JavaScript 执行环境的攻击者**。

清除站点数据后，设备 secret 和已保存 provider 配置都可能丢失，需要重新填写 key。

## WebCrypto 与安全上下文

加密依赖 WebCrypto。支持：

- HTTPS
- `localhost`
- `127.0.0.1`

普通局域网 HTTP IP 不一定具备 secure context，可能导致 WebCrypto 不可用。

## PWA

Service Worker 用于应用静态资源缓存和更新，不是业务数据云同步。

PWA 存储仍受 origin 隔离；例如 5173 与 4173 是两个不同数据空间。

## 静态托管安全头

仓库提供 `public/_headers` 作为支持该格式的静态托管平台配置，包括：

- HSTS
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- COOP / COEP
- CSP

其中 WebContainer 兼容能力仍要求较宽松的脚本执行策略。即使相关高级入口默认隐藏，修改 CSP 前也必须验证 WebContainer 兼容性。

## 安全范围

欢迎报告：

- XSS / 注入
- 未经用户同意的数据外传
- 加密或密钥存储缺陷
- 备份导入边界绕过
- AI tool 参数校验 / 权限绕过
- CSP / origin 边界问题

通常不属于 LifeOS 应用漏洞：

- 需要完全控制用户设备后才能利用的问题
- 没有 LifeOS 可利用路径的第三方浏览器漏洞
- 仅依赖用户主动粘贴恶意开发者代码的场景

## 相关文档

- [隐私与安全](docs/privacy-security.md)
- [备份与恢复](docs/backup-sync.md)
- [AI 架构](docs/technical/AI_ARCHITECTURE.md)
