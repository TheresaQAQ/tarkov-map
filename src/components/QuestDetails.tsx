import { localizeGameText, t, g, localizeQuestSummary } from "../i18n";
import { useLanguage } from "../use-language";
import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { loadQuestCatalog, loadQuestLinks, resolveQuestObjective } from "../quest-catalog";
import { validatedWikiUrl } from "../quest-links";
import { isTauriRuntime } from "../locator";
import type { QuestGameMode, QuestObjectivePoi } from "../types";
import { Dialog } from "./Dialog";
import { QuestImage } from "./QuestImage";
import { QuestLocationPreview } from "./QuestLocationPreview";

export function QuestDetails({
  poi,
  mode,
  onClose,
}: {
  poi: QuestObjectivePoi;
  mode: QuestGameMode;
  onClose: () => void;
}) {
  useLanguage();
  const [details, setDetails] = useState<ReturnType<typeof resolveQuestObjective>>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [wikiUrl, setWikiUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    setDetails(null);
    setWikiUrl(null);
    setLinkError(false);
    setState("loading");
    void loadQuestCatalog(mode)
      .then((bundle) => {
        if (disposed) return;
        const next = resolveQuestObjective(bundle, poi);
        setDetails(next);
        setState(next ? "ready" : "error");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });
    void loadQuestLinks()
      .then((metadata) => {
        if (!disposed)
          setWikiUrl(
            validatedWikiUrl(
              metadata.links.find((link) => link.taskId === poi.taskId && link.gameMode === mode)?.wikiUrl,
            ),
          );
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [mode, poi, retry]);

  return (
    <Dialog className="quest-marker-dialog" titleId="quest-marker-title" onClose={onClose}>
      <header>
        <div>
          <span className="kicker">
            {t("QUEST OBJECTIVE")}
            {details ? ` · ${g(details.quest.traderName, `${details.quest.traderId} Nickname`)}` : ""}
          </span>
          <h2 id="quest-marker-title">{g(details?.quest.name ?? poi.name, `${poi.taskId} name`)}</h2>
        </div>
        <button className="quest-details-close" aria-label={t("Close quest details")} onClick={onClose}>
          {t("Close")}
        </button>
      </header>
      <div className="quest-marker-body">
        {state === "loading" && <p role="status">{t("Loading bundled quest information…")}</p>}
        {state === "error" && (
          <p role="status">
            {t("Additional quest information is unavailable. The marker description remains below.")}{" "}
            <button onClick={() => setRetry((value) => value + 1)}>{t("Retry details")}</button>
          </p>
        )}
        {details && <p className="quest-marker-summary">{localizeQuestSummary(details.quest)}</p>}
        <section aria-label={t("Selected objective")}>
          <h3>{details?.objective.optional ? t("Optional objective") : t("Objective")}</h3>
          <p>{localizeGameText(details?.objective.description ?? poi.description, poi.objectiveId)}</p>
          {details && details.objective.details.length > 0 && (
            <ul>
              {details.objective.details.map((detail, index) => (
                <li key={index}>{localizeGameText(detail)}</li>
              ))}
            </ul>
          )}
        </section>
        {poi.kind === "quest-possible-location" && (
          <p className="quest-location-caution">
            {t("Possible location {index} of {count}", {
              index: (poi.locationIndex ?? 0) + 1,
              count: poi.locationCount ?? 1,
            })}
            {t(". A spawn here is not guaranteed; check the other possible locations.")}
          </p>
        )}
        <div className="quest-marker-images">
          <QuestLocationPreview poi={poi} />
          <QuestImage
            key={`${mode}:${poi.taskId}`}
            taskId={poi.taskId}
            mode={mode}
            name={g(details?.quest.name ?? poi.name, `${poi.taskId} name`)}
          />
        </div>
        {wikiUrl ? (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="quest-wiki-link"
            onClick={(event) => {
              if (!isTauriRuntime()) return;
              event.preventDefault();
              const safeUrl = validatedWikiUrl(wikiUrl);
              if (safeUrl) void openUrl(safeUrl).catch(() => setLinkError(true));
            }}
          >
            {t("Open Tarkov Wiki ↗")}
          </a>
        ) : (
          <p className="quest-wiki-unavailable">{t("No verified Wiki link available.")}</p>
        )}
        {linkError && (
          <p role="status">
            {t("Could not open the Wiki.")}{" "}
            <button
              onClick={() => {
                if (wikiUrl) void navigator.clipboard.writeText(wikiUrl).catch(() => undefined);
              }}
            >
              {t("Copy Wiki link")}
            </button>
          </p>
        )}
      </div>
    </Dialog>
  );
}
