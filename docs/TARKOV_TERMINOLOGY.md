# 塔科夫术语的中英对照与来源

游戏内的命名不采用自由翻译。地图、撤离点、商人、物品和任务文本通过同一个语言词条键连接英文与简体中文，逐字保留来源里的大小写、缩写和中文译名。

主要来源是 [Tarkov.dev 的语言数据](https://tarkov.dev/api/)。例如：

- 地图和撤离点：[英文](https://json.tarkov.dev/regular/maps_en)、[中文](https://json.tarkov.dev/regular/maps_zh)。
- 商人：[英文](https://json.tarkov.dev/regular/traders_en)、[中文](https://json.tarkov.dev/regular/traders_zh)。
- 物品：[英文](https://json.tarkov.dev/regular/items_en)、[中文](https://json.tarkov.dev/regular/items_zh)。
- 任务：[英文](https://json.tarkov.dev/regular/tasks_en)、[中文](https://json.tarkov.dev/regular/tasks_zh)。PvE 和赛季模式也保留各自的数据来源。

源代码里的 `src/locales/tarkov-zh-CN.json` 是实际使用的完整对照文件。每条 `entries` 记录包含 `key`、`en`、`zh` 和 `source`；`source` 指向 `sources` 数组中的中英文原始地址和各自的 SHA-256。文件自身的哈希记录在相邻的 `tarkov-text-checksums.json` 文件中。

## 已核对的例子

- `Ground Zero` → `中心区`，词条键 `653e6760052c01c1c805532f Name`。
- `Terminal` → `码头`，词条键 `65cc8f81a9aac3e77d0cfd3e Name`。
- `RUAF Roadblock` → `RUAF路障`，词条键 `RUAF Roadblock`。
- `Bunker Hermetic Door` → `地堡密闭门`，词条键 `EXFIL_Bunker`。
- 商人 `Ref` → `竞技场裁判`，词条键 `6617beeaa9cfa777ca915b7c Nickname`。物品简称里的 `Ref` 对应 `裁判`，两者不能只凭英文字符串混用。
- 地图 `Reserve` → `储备站`；任务 `Reserve` → `储备`，后者的词条键为 `5d25e4d586f77443e625e388 name`。
- 任务 `Farming` → `挖矿`，词条键 `5ac3462b86f7741d6118b983 name`。
- `Prapor`、`Therapist` 等商人昵称在中文来源中保留英文，不替换成自行音译或意译的中文。

## 缺少译文与旧文本

Tarkov.dev 会省略中英文相同的值。这样的缺项按其英文原文保留，不能视为必须补写中文的遗漏。

部分旧名称和 `Found in raid` 状态也参考公开的游戏语言文件镜像：[英语](https://raw.githubusercontent.com/carlsmei/tarkovdata/08649f48a43fe8f4bea311b23a224a278a26492b/languages/en.json)、[简体中文](https://raw.githubusercontent.com/carlsmei/tarkovdata/08649f48a43fe8f4bea311b23a224a278a26492b/languages/ch.json)。该镜像明确记录为游戏版本 `1.0.2.0.43037`，固定提交用于追溯；不把它描述为当前客户端的完整词库。`FoundInRaid` 中的原文为 `Found in raid` / `在战局中找到`。

找不到对应词条或英文存在多个不同中文值时，显示英文。命名有明确 ID 时按 ID 查询；任务目标还要求来源英文与原快照文本匹配，防止把不同版本的数量或条件写入旧快照的展示。

应用自己的操作说明、按钮、楼层注释和分类名称由 `src/locales/zh-CN.ts` 维护。这些文案不冒充游戏词库，不会覆盖游戏命名。地图坐标、任务规则、OCR 别名、settings v2 和 protocol v1 不因术语修正而迁移。
