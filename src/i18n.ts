import { zhCN } from "./locales/zh-CN";
import { gameText, gameTextByKey } from "./locales/game-text";
import type { MapPoi, QuestDefinition } from "./types";

export type Language = "zh-CN" | "en";
export const languageStorageKey = "raid-signal-language";
const listeners = new Set<() => void>();
let language: Language | undefined;

function validatedLanguage(value: unknown): Language {
  return value === "en" ? "en" : "zh-CN";
}

export function getLanguage(): Language {
  if (language === undefined) {
    try {
      language = validatedLanguage(localStorage.getItem(languageStorageKey));
    } catch {
      language = "zh-CN";
    }
  }
  return language;
}

export function setLanguage(value: Language) {
  if (value !== "en" && value !== "zh-CN") return;
  language = value;
  try {
    localStorage.setItem(languageStorageKey, value);
  } catch {
    // Keep the selection usable when browser storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== languageStorageKey && event.key !== null) return;
  language = validatedLanguage(event.newValue);
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function chineseText(message: string) {
  const trimmed = message.trim();
  if (Object.hasOwn(zhCN, message)) return zhCN[message];
  if (Object.hasOwn(zhCN, trimmed)) return zhCN[trimmed];
  return message;
}

export function chineseGameText(message: string, localeKey?: string) {
  const trimmed = message.trim();
  const entry = localeKey ? gameTextByKey.get(localeKey) : undefined;
  if (entry) return entry.zh;
  return gameText.get(trimmed) ?? message;
}

export function g(message: string | null | undefined, localeKey?: string) {
  const original = message ?? "";
  if (getLanguage() === "zh-CN") return chineseGameText(original, localeKey);
  return (localeKey ? gameTextByKey.get(localeKey)?.en : undefined) ?? original;
}

export function gm(message: string | null | undefined) {
  return g(message, `map:${message ?? ""}`);
}

function poiLocaleKey(poi: MapPoi) {
  if ("taskId" in poi) return `${poi.taskId} name`;
  for (const alias of [...(poi.aliases ?? []), poi.name])
    if (gameTextByKey.get(alias)?.en.trim() === poi.name.trim()) return alias;
  return `map:${poi.name}`;
}

export function chinesePoiName(poi: MapPoi) {
  if (poi.kind === "custom-pin") return chineseText(poi.name);
  return chineseGameText(poi.name, poiLocaleKey(poi));
}

export function poiName(poi: MapPoi) {
  if (getLanguage() === "zh-CN") return chinesePoiName(poi);
  return g(poi.name, poiLocaleKey(poi));
}

export function t(message: string | null | undefined, values: Record<string, string | number> = {}) {
  const original = message ?? "";
  const translated = getLanguage() === "zh-CN" ? chineseText(original) : original;
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}

export function localizeGameText(message: string, localeKey?: string): string {
  if (getLanguage() === "en") return message;
  const entry = localeKey ? gameTextByKey.get(localeKey) : undefined;
  const exact = entry?.en.trim() === message.trim() ? entry.zh : g(message);
  if (exact !== message) return exact;
  if (message.includes(" · "))
    return message
      .split(" · ")
      .map((part) => localizeGameText(part))
      .join(" · ");
  for (const prefix of ["Required count", "Required item", "Accepted items", "Targets", "Distance"]) {
    if (message.startsWith(`${prefix}: `)) {
      const value = message.slice(prefix.length + 2);
      return `${t(prefix)}：${
        prefix === "Accepted items" || prefix === "Targets"
          ? value
              .split(", ")
              .map((part) => g(part))
              .join("、")
          : g(value)
      }`;
    }
  }
  const reward = /^(.*?) × (.+)$/.exec(message);
  if (reward) return `${reward[1]} × ${g(reward[2])}`;
  const experience = /^([\d,]+) XP$/.exec(message);
  if (experience) return t("{count} XP", { count: experience[1] });
  const reputation = /^([+-]?[\d.]+) (.+) reputation$/.exec(message);
  if (reputation) return t("{count} {trader} reputation", { count: reputation[1], trader: g(reputation[2]) });
  const itemTypes = /^(\d+) accepted item types$/.exec(message);
  if (itemTypes) return t("{count} accepted item types", { count: itemTypes[1] });
  if (message === "Items must have Found in Raid status")
    return t("Items must have {status} status", { status: g("Found in raid", "FoundInRaid") });
  return message;
}

export function localizeQuestSummary(quest: Pick<QuestDefinition, "summary" | "objectives">) {
  return quest.summary
    .split(" · ")
    .map((part) =>
      localizeGameText(part, quest.objectives.find((objective) => objective.description.trim() === part.trim())?.id),
    )
    .join(" · ");
}

export function localizeMessage(message: string | null | undefined): string {
  const original = message ?? "";
  if (getLanguage() === "en") return original;
  const imported = /^(\d+) new log events imported$/.exec(original);
  if (imported) return t("{count} new log events imported", { count: imported[1] });
  const reconnecting = /^(.+)\. Reconnecting in (\d+)s\.$/.exec(original);
  if (reconnecting)
    return t("{reason}. Reconnecting in {seconds}s.", { reason: t(reconnecting[1]), seconds: reconnecting[2] });
  const mapIntel = /^Unable to load map intelligence \((\d+)\)$/.exec(original);
  if (mapIntel) return t("Unable to load map intelligence ({status})", { status: mapIntel[1] });
  const unavailable = /^Unable to load (.+)$/.exec(original);
  if (unavailable) return t("Unable to load {name}", { name: unavailable[1] });
  for (const prefix of [
    "Error",
    "Overlay initialization failed",
    "Could not watch screenshots",
    "Could not create screenshot watcher",
    "Could not delete parsed screenshot",
    "Overlay shortcut failed",
    "Overlay recovery shortcut failed",
    "Quest log scan could not finish",
    "Diagnostics could not be copied",
  ]) {
    if (original.startsWith(`${prefix}: `))
      return `${t(prefix)}: ${localizeMessage(original.slice(prefix.length + 2))}`;
  }
  return t(original);
}

export function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    "extract-pmc": "PMC extracts",
    "extract-scav": "Scav extracts",
    "extract-shared": "Shared extracts",
    transit: "Transits",
    switch: "Switches",
    btr: "BTR stops",
    hazard: "Hazards",
    "boss-zone": "Boss zones",
    "locked-door": "Locked access",
    "spawn-pmc": "PMC spawns",
    "spawn-scav": "Scav spawns",
    "spawn-boss": "Boss spawns",
    "spawn-sniper": "Sniper spawns",
    "spawn-other": "Other spawns",
    loot: "Loot containers",
    "stationary-weapon": "Stationary weapons",
    "quest-objective": "QUEST OBJECTIVE",
    "custom-pin": "Custom waypoint",
  };
  return t(Object.hasOwn(labels, category) ? labels[category] : category.replaceAll("-", " "));
}
