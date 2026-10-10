## Raid Signal v1.4.1 中文版

基于 [QTtrash/tarkov-map](https://github.com/QTtrash/tarkov-map) 的 v1.4.1，增加简体中文界面并保留英文切换。这是 TheresaQAQ 维护的汉化发行版，原项目及资源作者的署名与许可证保持不变。

## 本次更新

- 桌面端、原生地图浮窗和手机端默认简体中文，可切换为英文并保存选择。
- 地图、撤离点、任务、物品和商人名称通过来源词条键取中英原文；保留来源中的英文昵称，缺少可靠对照时不猜译名。
- 使用微软雅黑，提高文字字号、字重和对比度。
- Windows x64 安装向导支持简体中文与英文。
- 修复 Sharp 和 source-map-js 的已知依赖漏洞。

## 下载与校验

下载下面附件中的 `Raid-Signal-Setup-1.4.1.exe`。同页提供 `.sha256` 校验文件、`release.json`、SPDX SBOM 和 GitHub 构建来源证明。

安装包由本仓库的发布工作流构建，必须通过项目检查、浏览器测试、Microsoft Defender 和独立 ClamAV 扫描后才会发布。

这是未签名的 Windows 安装包，系统可能显示“未知发布者”。运行安装好的程序不需要 Rust、Node.js 或编译环境。

## 兼容性与隐私

继续兼容 settings schema v2 和 room protocol v1。任务进度保存在本机；邀请密钥仅保留在 URL 的 `#` 片段中，中继只转发密文，不保存位置历史。

任务日志自动导入仍是实验性功能。不要公开原始游戏日志。应用不读取游戏内存、不注入输入、不修改游戏文件，也不宣称获得官方或反作弊认可。

- [中文使用说明](https://github.com/TheresaQAQ/tarkov-map/blob/v1.4.1/README.zh-CN.md)
- [中英术语对照和来源](https://github.com/TheresaQAQ/tarkov-map/blob/v1.4.1/docs/TARKOV_TERMINOLOGY.md)
- [源代码](https://github.com/TheresaQAQ/tarkov-map/tree/v1.4.1)
- [资源许可证与署名](https://github.com/TheresaQAQ/tarkov-map/blob/v1.4.1/ASSET_LICENSES.md)
- [原项目](https://github.com/QTtrash/tarkov-map)
