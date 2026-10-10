# Raid Signal 中文说明

Raid Signal 是面向 Windows 的《逃离塔科夫》地图与任务导航工具，支持地图浮窗、手机地图和端到端加密的小队位置共享。

原仓库：[QTtrash/tarkov-map](https://github.com/QTtrash/tarkov-map)。[English README](README.md)。

[下载 Windows 中文版安装包](https://github.com/TheresaQAQ/tarkov-map/releases/latest)。这是本仓库维护的汉化发行版；原项目与各资源作者的署名及许可证保持不变。

## 语言切换

首次打开默认使用简体中文。桌面窗口顶部、设置页面、地图浮窗和手机端均提供语言选择，可随时切换为 English。

语言选择保存在当前设备的本地浏览器存储中，刷新或重启后继续使用。桌面主窗口与浮窗在相同存储来源下同步语言，手机端独立选择。

汉化包含操作按钮、设置、状态提示、地图图例、地图和楼层名称、撤离点、任务名称、目标说明、商人及常用物品文本。中文搜索和英文搜索均可用于查找任务和地点。已有地图图片、图片内嵌文字和外部 Wiki 页面保持原始内容；未收录的新文本会显示英文。

## 基本使用

1. 启动桌面应用，在设置中确认截图文件夹和塔科夫日志根目录。
2. 在游戏内截图，应用从截图文件名获取坐标并更新地图位置。
3. 打开地图信息面板，选择撤离点、危险区域、物资容器等图层。
4. 打开任务导航，按地图、商人和任务状态筛选，也可手动记录任务进度。
5. 使用 `Ctrl+Shift+M` 显示或隐藏浮窗，使用 `Ctrl+Shift+X` 恢复浮窗的鼠标交互。
6. 需要小队共享时，打开“手机 / 小队共享”，创建互联网房间或同一可信网络内的局域网会话，再向队友提供邀请链接。

日志任务导入是实验性功能，首次写入前需要预览和确认。遇到兼容性问题时使用“复制诊断摘要”，不要公开原始游戏日志。

本应用仅观察游戏生成的截图文件名和日志，不读取游戏内存、不注入输入，也不修改游戏文件。这不代表获得官方认可或反作弊安全保证。邀请链接包含密钥，应仅提供给可信队友；密钥保留在 URL 的 `#` 片段中，中继仅转发密文，不保存位置历史。

## 开发与验证

按原项目要求准备 Node 22.23、npm 11.14、Rust 1.93，以及 [Tauri 的 Windows 开发依赖](https://v2.tauri.app/start/prerequisites/)。

```text
npm ci
npm --prefix relay ci
npx playwright install chromium
npm run check:all
npm run test:e2e
npm run tauri:dev
```

仅预览浏览器界面时运行 `npm run dev`。生成 Windows 安装包时运行 `npm run tauri:build`。

## 维护译文

- 应用自身的界面译文位于 `src/locales/zh-CN.ts`；游戏名称不使用手写译名覆盖。
- 游戏术语的中英对照位于 `src/locales/tarkov-zh-CN.json`。各条目保留原始词条键、中英文和来源索引，原始响应及文件自身均记录 SHA-256。[术语对照说明](docs/TARKOV_TERMINOLOGY.md) 列出了可核查的实例与来源版本。
- 任务、商人等按词条 ID 区分同名内容；中文来源本身保留英文时也保留英文。缺少对应词条时不猜译名。
- `npm run text:sync:zh` 仅更新语言字典，不更新地图、坐标、任务规则或图像。更新后检查译文、来源与哈希，再运行验证。
- 持久化设置继续使用 schema v2，小队共享继续使用 protocol v1。语言设置独立于这些协议。

原代码与文档采用 Apache-2.0。地图、游戏数据和中文数据译文适用各自的来源条款，详见 [资源许可证与来源记录](ASSET_LICENSES.md) 和 [第三方声明](THIRD_PARTY_NOTICES.md)。
