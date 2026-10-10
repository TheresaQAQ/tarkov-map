import { t, g } from "../i18n";
import { useLanguage } from "../use-language";
import { useEffect, useState } from "react";
import { loadQuestImages } from "../quest-catalog";
import type { QuestGameMode } from "../types";

export function QuestImage({ taskId, mode, name }: { taskId: string; mode: QuestGameMode; name: string }) {
  useLanguage();
  const [entry, setEntry] = useState<Awaited<ReturnType<typeof loadQuestImages>>["images"][number] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    let disposed = false;
    setEntry(null);
    setState("loading");
    void loadQuestImages()
      .then((metadata) => {
        if (disposed) return;
        const image = metadata.images.find((candidate) => candidate.taskId === taskId && candidate.gameMode === mode);
        setEntry(image ?? null);
        if (!image) setState("unavailable");
      })
      .catch(() => {
        if (!disposed) setState("unavailable");
      });
    return () => {
      disposed = true;
    };
  }, [mode, taskId]);

  return (
    <figure className="quest-artwork">
      {entry && state !== "unavailable" && (
        <img
          src={`${entry.path}?v=${entry.sha256.slice(0, 16)}`}
          alt={t("Generic quest artwork for {name}; not an objective-location photograph", { name: g(name) })}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("unavailable")}
        />
      )}
      {state === "loading" && <p role="status">{t("Loading quest artwork…")}</p>}
      {state === "unavailable" && (
        <p role="status">{t("Quest artwork unavailable. Use the objective text and location map.")}</p>
      )}
      {entry && (
        <figcaption title={entry.sourceUrl}>
          {t("Generic quest image · Source: Tarkov.dev (assets.tarkov.dev)")}
          <br />
          Escape from Tarkov © Battlestate Games
        </figcaption>
      )}
    </figure>
  );
}
