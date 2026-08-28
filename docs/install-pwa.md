# PWA 安装与本地使用

LifeOS 当前是 **Web + PWA**，不是 Electron / Tauri 桌面安装包。

PWA 的意思是：网页仍由浏览器技术运行，但安装后会有独立窗口、应用图标、开始菜单 / Dock 入口，并可缓存部分静态资源。

## 本地安装

先构建生产版：

```bash
npm ci
npm run build
npm run preview
```

默认打开：

```text
http://localhost:4173
```

Chrome / Edge 通常会在地址栏显示“安装应用”图标；也可以从浏览器菜单选择“安装 LifeOS”。

开发服务器 `npm run dev` 默认是 `http://localhost:5173`。Vite 配置明确关闭了开发模式 Service Worker，因此请用生产 preview 或 HTTPS 部署来测试 PWA。

## 安装以后是否还要开浏览器标签页

不需要。

安装后的 LifeOS 会用独立窗口运行，普通 Chrome / Edge 标签页可以关闭。

但如果 PWA 安装自 `http://localhost:4173`：

- `npm run preview` 或其他为 4173 提供页面的本地服务仍应保持运行；
- Service Worker 会缓存应用壳和部分静态资源，但不要把“缓存能打开”理解为长期不需要服务器；
- 刷新、加载未缓存代码块、更新版本等仍可能访问 origin。

长期自用更适合让一个稳定的本地静态服务器开机后台启动，或部署到固定 HTTPS 地址后再安装 PWA。

## 为什么 5173 的数据在 4173 看不到

浏览器存储按 origin 隔离：

```text
http://localhost:5173  ≠  http://localhost:4173
```

IndexedDB、localStorage、Service Worker 都属于各自 origin。

切换地址前请先在旧 origin 导出 `.brain` 备份，再到新 origin 导入。

## PWA 能做什么

- 独立窗口
- 桌面 / 开始菜单 / Dock 图标
- 固定到任务栏
- Service Worker 静态缓存
- Web 通知（取决于浏览器与系统权限）
- 继续使用 IndexedDB 本地数据

## PWA 不能替代什么

当前仓库没有 Electron / Tauri，因此没有：

- Windows `.exe` / `.msi`
- macOS `.app` / `.dmg`
- Linux `.AppImage` / `.deb`
- 原生系统托盘
- 原生开机自启
- 不依赖 Web origin 的原生数据目录

## 更新 PWA

项目使用 `vite-plugin-pwa`，更新策略为 prompt。发布新构建后，Service Worker 检测到新版本时由应用提示用户更新。

## 相关指南

- [快速入门](./getting-started.md)
- [备份与恢复](./backup-sync.md)
- [故障排除](./troubleshooting.md)
