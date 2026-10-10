import { beforeEach, describe, expect, it, vi } from "vitest";
import { zhCN } from "./locales/zh-CN";

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe("language boundaries", () => {
  it("defaults to Simplified Chinese and safely falls back for unknown or prototype names", async () => {
    const { getLanguage, g, gm, t } = await import("./i18n");
    expect(getLanguage()).toBe("zh-CN");
    expect(gm("Customs")).toBe("海关");
    expect(g("First in Line")).toBe("新手上路");
    expect(t("Customs")).toBe("Customs");
    expect(t("constructor")).toBe("constructor");
    expect(t("Unknown future task")).toBe("Unknown future task");
  });

  it("validates saved selections and synchronizes mounted surfaces through storage events", async () => {
    localStorage.setItem("raid-signal-language", '{"language":"en"}');
    const { getLanguage, languageStorageKey, subscribeLanguage, gm } = await import("./i18n");
    expect(getLanguage()).toBe("zh-CN");
    const changed = vi.fn();
    const unsubscribe = subscribeLanguage(changed);
    window.dispatchEvent(new StorageEvent("storage", { key: languageStorageKey, newValue: "en" }));
    expect(changed).toHaveBeenCalledOnce();
    expect(gm("Customs")).toBe("Customs");
    window.dispatchEvent(new StorageEvent("storage", { key: languageStorageKey, newValue: "unsupported" }));
    expect(getLanguage()).toBe("zh-CN");
    unsubscribe();
  });

  it("keeps language switching usable when storage access fails", async () => {
    const reader = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const writer = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    try {
      const { getLanguage, setLanguage, t } = await import("./i18n");
      expect(getLanguage()).toBe("zh-CN");
      setLanguage("en");
      expect(t("Settings")).toBe("Settings");
    } finally {
      reader.mockRestore();
      writer.mockRestore();
    }
  });

  it("retains every dynamic value in the interface translations", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const [source, translation] of Object.entries(zhCN))
      expect(placeholders(translation), source).toEqual(placeholders(source));
  });
});
