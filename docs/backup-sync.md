# 备份与恢复

LifeOS 是 local-first 应用：数据主要存在当前浏览器 / PWA 的 IndexedDB 中，因此**备份是使用产品的一部分**。

## 最重要的三件事

1. 定期导出 `.brain` 全量备份；
2. 在清理浏览器数据、换端口、换域名、换浏览器前先导出；
3. 恢复后先检查任务、笔记、收藏和日程，再继续写入。

## 浏览器 origin 很重要

下面两个地址的数据默认互不相通：

```text
http://localhost:5173
http://localhost:4173
```

即使都叫 LifeOS，它们对浏览器来说也是不同 origin。

PWA 安装自哪个 origin，就使用哪个 origin 的 IndexedDB / localStorage。

## .brain 备份

全量备份用于迁移和灾难恢复，包含主要业务数据及相关附件数据。

AI API key 不包含在 `.brain` 备份中；换浏览器或清除站点数据后需要重新配置 key。

## 自动保存到本机文件夹

Chromium 系浏览器支持 File System Access API 时，可以让 LifeOS 写入你主动选择的本机文件夹。

如果这个文件夹位于 OneDrive / iCloud Drive / Google Drive / Dropbox 等同步目录：

```text
LifeOS → 本机文件夹 → 云盘桌面客户端 → 云端
```

LifeOS 自己不会登录云盘、不会把备份上传到 LifeOS 服务器。

历史版本目录可能继续使用兼容名称 `.neuman-backups`；不要手动删除仍在使用的备份目录。

## PWA 与备份

PWA 不等于云同步。安装 PWA 只是改变启动方式和缓存能力，不会自动把 IndexedDB 同步到其他设备。

## 恢复建议

1. 在新 origin 打开 LifeOS；
2. 进入设置的数据 / 备份区域；
3. 导入 `.brain`；
4. 刷新后检查关键模块；
5. 确认无误后再开始新写入。

## 相关指南

- [PWA 安装](./install-pwa.md)
- [隐私与安全](./privacy-security.md)
- [故障排除](./troubleshooting.md)
