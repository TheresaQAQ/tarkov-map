import { z } from "zod";

const sourceUrl = z
  .string()
  .url()
  .refine((value) =>
    /^https:\/\/(?:json\.tarkov\.dev\/|raw\.githubusercontent\.com\/carlsmei\/tarkovdata\/[a-f0-9]{40}\/)/.test(value),
  );
const boundedText = z.string().min(1).max(4096);

export const gameTextSchema = z
  .object({
    schemaVersion: z.literal(2),
    retrievedAt: z.iso.datetime(),
    sources: z
      .array(
        z.object({
          kind: z.enum(["tarkov-dev", "game-locale-mirror"]),
          englishUrl: sourceUrl,
          chineseUrl: sourceUrl,
          englishSha256: z.string().regex(/^[a-f0-9]{64}$/),
          chineseSha256: z.string().regex(/^[a-f0-9]{64}$/),
          gameVersion: z.string().max(64).optional(),
        }),
      )
      .min(1)
      .max(16),
    entries: z
      .array(
        z.object({
          key: z.string().min(1).max(512),
          en: boundedText,
          zh: boundedText,
          source: z.number().int().min(0).max(15),
        }),
      )
      .max(15_000),
  })
  .superRefine((bundle, context) => {
    const seen = new Set<string>();
    for (const [index, entry] of bundle.entries.entries()) {
      if (entry.source >= bundle.sources.length)
        context.addIssue({ code: "custom", path: ["entries", index, "source"], message: "Unknown text source" });
      const identity = `${entry.source}:${entry.key}`;
      if (seen.has(identity))
        context.addIssue({ code: "custom", path: ["entries", index, "key"], message: "Duplicate locale key" });
      seen.add(identity);
    }
  });

export type GameTextBundle = z.infer<typeof gameTextSchema>;
