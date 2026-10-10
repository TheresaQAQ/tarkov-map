import bundledText from "./tarkov-zh-CN.json";
import { gameTextSchema } from "./game-text-schema";

export const gameTextBundle = gameTextSchema.parse(bundledText);
const candidates = new Map<string, Set<string>>();
export const gameTextByKey = new Map<string, { en: string; zh: string }>();
for (const entry of gameTextBundle.entries) {
  if (gameTextBundle.sources[entry.source].englishUrl.endsWith("/regular/maps_en"))
    gameTextByKey.set(`map:${entry.en}`, entry);
  if (gameTextByKey.has(entry.key)) continue;
  gameTextByKey.set(entry.key, entry);
  const english = entry.en.trim();
  const values = candidates.get(english) ?? new Set<string>();
  values.add(entry.zh);
  candidates.set(english, values);
}

// Ambiguous English strings require their locale key instead of an arbitrary first match.
export const gameText = new Map(
  [...candidates].filter(([, values]) => values.size === 1).map(([english, values]) => [english, [...values][0]]),
);
