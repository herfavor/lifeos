# 隐私与安全

LifeOS 的核心原则是：**你的业务数据默认留在当前设备 / 浏览器 origin。**

## 本地保存

任务、项目、日程、笔记、收藏、习惯等主要数据通过 IndexedDB / Dexie 保存；部分界面偏好和小型配置使用 localStorage。

没有 LifeOS 账户系统，也没有 LifeOS 云同步服务。

## 浏览器 origin 边界

本地存储不是“整台电脑共享数据库”，而是按 origin 隔离。

例如：

- `http://localhost:5173`
- `http://localhost:4173`
- `https://lifeos.example.com`

三者数据默认相互独立。

## 哪些功能会联网

只有主动使用相应能力时才需要网络，例如：

- AI provider 请求
- 天气 / 新闻 / 外部信息组件
- 外部链接 / 图片 / 地图资源
- 你自己部署的代理

PWA Service Worker 也会获取和缓存当前应用的静态资源；这不是业务数据云同步。

## AI API key

API key 通过设备管理密钥加密后保存在本地。

- LifeOS 不提供 API key 中转服务器；
- `.brain` 默认不包含 API key；
- 清除站点数据会同时清除设备密钥和已保存 provider 配置，需要重新填写。

## AI 上下文

今日快照用于数量型状态摘要。

跨模块上下文是显式开关。开启后，选定的任务、日程、笔记等上下文会随 prompt 发送给当前 AI provider，因此只应对你信任的 provider 开启。

## 高风险操作

AI 新用户默认使用自动执行，但删除任务、事件、笔记、时间记录和例行仍强制确认。

普通 UI 中的永久删除也应与可恢复归档 / 回收站分开。

## 备份

本地优先意味着你承担备份责任。建议定期导出 `.brain`，并把自动备份文件夹交给你自己信任的同步工具。

## 相关指南

- [备份与恢复](./backup-sync.md)
- [AI 管理](./ai-management.md)
- [后端代理](./backend-proxy-setup.md)
