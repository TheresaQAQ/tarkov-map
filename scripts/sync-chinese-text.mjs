import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gameTextSchema } from "../src/locales/game-text-schema.ts";

const root = path.resolve(import.meta.dirname, "..");
const destination = path.join(root, "src/locales/tarkov-zh-CN.json");
const checksumPath = path.join(root, "src/locales/tarkov-zh-CN.sha256");
const maxBytes = 8 * 1024 * 1024;
const endpoints = [
  "regular/maps",
  "regular/tasks",
  "pve/tasks",
  "pvp-season/tasks",
  "regular/items",
  "regular/traders",
];

async function dictionary(url, wrapped = true) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!response.ok) throw new Error(`Translation source returned HTTP ${response.status}`);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) throw new Error("Translation response exceeds the size limit");
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const value = JSON.parse(buffer.toString("utf8"));
  const data = wrapped ? value?.data : value;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid translation dictionary");
  const entries = Object.entries(data);
  if (entries.length > 30_000) throw new Error("Translation dictionary exceeds the entry limit");
  const result = new Map();
  for (const [key, text] of entries) {
    if (key.length > 512 || typeof text !== "string" || !text.trim() || text.length > 4096) continue;
    result.set(key, text);
  }
  return { values: result, sha256: createHash("sha256").update(buffer).digest("hex") };
}

const texts = new Set();
function collect(value) {
  if (typeof value === "string") texts.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === "object") Object.values(value).forEach(collect);
}
for (const folder of ["public/maps/quests", "public/maps/poi"]) {
  for (const filename of await readdir(path.join(root, folder))) {
    if (!filename.endsWith(".json")) continue;
    collect(JSON.parse(await readFile(path.join(root, folder, filename), "utf8")));
  }
}
collect(JSON.parse(await readFile(path.join(root, "src/data/maps.generated.json"), "utf8")));

const sources = [];
const retainedText = [...texts].join("\n");
const pairs = await Promise.all(
  endpoints.map(async (endpoint) => {
    const urls = ["en", "zh"].map((lang) => `https://json.tarkov.dev/${endpoint}_${lang}`);
    const [english, chinese] = await Promise.all(urls.map((url) => dictionary(url)));
    return { urls, english, chinese };
  }),
);
// Publicly archived game locale files cover retained English nicknames and missing legacy labels.
const revision = "08649f48a43fe8f4bea311b23a224a278a26492b";
const localeUrls = ["en", "ch"].map(
  (language) => `https://raw.githubusercontent.com/carlsmei/tarkovdata/${revision}/languages/${language}.json`,
);
const [localeEnglish, localeChinese] = await Promise.all(localeUrls.map((url) => dictionary(url, false)));
pairs.push({ urls: localeUrls, english: localeEnglish, chinese: localeChinese });
const basicKeys = new Set(["FoundInRaid", "RaidSideScav", "RaidSidePmc", "Savage", "PmcBot", "ExUsec"]);
const entries = [];
for (const { urls, english, chinese } of pairs) {
  const source = sources.length;
  const mirror = urls[0].startsWith("https://raw.githubusercontent.com/");
  sources.push({
    kind: mirror ? "game-locale-mirror" : "tarkov-dev",
    englishUrl: urls[0],
    chineseUrl: urls[1],
    englishSha256: english.sha256,
    chineseSha256: chinese.sha256,
    ...(mirror ? { gameVersion: "1.0.2.0.43037" } : {}),
  });
  for (const [key, name] of english.values) {
    if (!retainedText.includes(name) && !texts.has(key.split(" ")[0]) && !basicKeys.has(key)) continue;
    // Tarkov.dev omits strings unchanged in Chinese: retaining English is intentional.
    const translated = chinese.values.get(key) ?? name;
    entries.push({ key, en: name, zh: translated, source });
  }
}
const uniqueEntryMap = new Map();
for (const entry of entries) {
  const identity = `${entry.key}\0${entry.en}\0${entry.zh}`;
  if (!uniqueEntryMap.has(identity)) uniqueEntryMap.set(identity, entry);
}
const uniqueEntries = [...uniqueEntryMap.values()];
const output = `${JSON.stringify(
  gameTextSchema.parse({
    schemaVersion: 2,
    retrievedAt: new Date().toISOString(),
    sources,
    entries: uniqueEntries,
  }),
  null,
  2,
)}\n`;
const hash = createHash("sha256").update(output).digest("hex");
await writeFile(destination, output);
await writeFile(checksumPath, `${hash}  src/locales/tarkov-zh-CN.json\n`);
console.log(`Saved ${uniqueEntries.length} source-keyed English/Chinese pairs; SHA-256 ${hash}`);
