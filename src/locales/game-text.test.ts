import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gameText, gameTextBundle, gameTextByKey } from "./game-text";
import { gameTextSchema } from "./game-text-schema";
import { g, gm, chinesePoiName, localizeGameText, poiName, setLanguage, t } from "../i18n";
import type { MapPoi } from "../types";

describe("bundled Chinese game text", () => {
  it("matches its recorded SHA-256 identity", () => {
    const bytes = readFileSync("src/locales/tarkov-zh-CN.json");
    const expected = JSON.parse(readFileSync("src/locales/tarkov-text-checksums.json", "utf8"))["tarkov-zh-CN.json"];
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected);
  });

  it("uses sourced game names instead of authored substitutes and preserves English nicknames", () => {
    setLanguage("zh-CN");
    expect(gameText.size).toBeGreaterThan(3000);
    expect(gm("Ground Zero")).toBe("中心区");
    expect(gm("Terminal")).toBe("码头");
    expect(gm("Reserve")).toBe("储备站");
    expect(g("Reserve", "5d25e4d586f77443e625e388 name")).toBe("储备");
    expect(g("Farming", "5ac3462b86f7741d6118b983 name")).toBe("挖矿");
    expect(g("RUAF Roadblock")).toBe("RUAF路障");
    expect(g("Bunker Hermetic Door")).toBe("地堡密闭门");
    expect(g("Therapist", "54cb57776803fa99248b456e Nickname")).toBe("Therapist");
    expect(g("Ref", "6617beeaa9cfa777ca915b7c Nickname")).toBe("竞技场裁判");
    expect(g("Ref")).toBe("Ref");
    const crossroads = JSON.parse(readFileSync("public/maps/poi/customs.json", "utf8")).pois.find(
      (poi: MapPoi) => poi.name === "Crossroads",
    ) as MapPoi;
    expect(poiName(crossroads)).toBe("十字路口");
    expect(chinesePoiName(crossroads)).toBe("十字路口");
    expect(localizeGameText("3,000 XP · +0.1 Therapist reputation")).toBe("3,000 经验 · +0.1 Therapist声望");
    expect(localizeGameText("Items must have Found in Raid status")).toBe("物品必须具有“在战局中找到”状态");
  });

  it("keeps interface words separate and resolves ambiguous objectives by their source key", () => {
    setLanguage("zh-CN");
    expect(t("Floor")).toBe("楼层");
    expect(t("Unknown")).toBe("未知");
    expect(g("Unknown future task")).toBe("Unknown future task");
    expect(g("constructor")).toBe("constructor");
    const objective = "65732ac3c67dcd96adffa3c7";
    const record = gameTextByKey.get(objective)!;
    expect(localizeGameText(record.en, objective)).toBe(record.zh);
    expect(record.zh).toBe("在中心区找到 Emercom 站点");
    expect(localizeGameText("Eliminate 9999 targets", objective)).toBe("Eliminate 9999 targets");
    setLanguage("en");
    expect(gm("Ground Zero")).toBe("Ground Zero");
    expect(g("Ref", "6617beeaa9cfa777ca915b7c Nickname")).toBe("Ref");
  });

  it("requires valid locale provenance at the bundled-data boundary", () => {
    expect(
      gameTextSchema.safeParse({ ...gameTextBundle, entries: [{ key: "id", en: "English", zh: "中文", source: 15 }] })
        .success,
    ).toBe(false);
    expect(
      gameTextSchema.safeParse({
        ...gameTextBundle,
        sources: [{ ...gameTextBundle.sources[0], chineseUrl: "https://untrusted.example/zh" }],
      }).success,
    ).toBe(false);
    for (const entry of gameTextBundle.entries) expect(gameTextBundle.sources[entry.source]).toBeDefined();
  });
});
