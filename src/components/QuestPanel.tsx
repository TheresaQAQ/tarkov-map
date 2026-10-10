import { chineseGameText, localizeGameText, localizeMessage, t, g, gm, localizeQuestSummary } from "../i18n";
import { useLanguage } from "../use-language";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMapDefinition } from "../data/maps";
import {
  confirmQuestSync,
  dismissQuestSyncPreview,
  getQuestProfiles,
  getQuestProgress,
  getQuestSyncPreview,
  isTauriRuntime,
  setQuestPlayerLevel,
  setQuestProgress,
  setQuestSyncEnabled,
  syncQuestProgress,
} from "../locator";
import { questCompatibilityIssueUrl, questDiagnosticSummary } from "../quest-diagnostics";
import { buildActiveQuestObjectivePois, compareQuests, effectiveQuestStatus, questStatuses } from "../quest";
import type {
  QuestBundle,
  QuestDisplayStatus,
  QuestGameMode,
  QuestObjectivePoi,
  QuestProfile,
  QuestProgress,
  QuestStatus,
  QuestSyncPreview,
} from "../types";
import { loadQuestCatalog } from "../quest-catalog";
import { Dialog } from "./Dialog";
import { UiIcon } from "./Icons";

interface QuestPanelProps {
  open: boolean;
  mapId: string;
  onClose: () => void;
  onFocusObjective: (mapId: string, poi: QuestObjectivePoi | null) => void;
  onActiveObjectivePoisChange?: (pois: QuestObjectivePoi[]) => void;
  onEnableQuestMarkersOnce?: () => void;
  onImportComplete?: () => void;
  onCatalogModeChange?: (mode: QuestGameMode) => void;
}

type StatusFilter = "all" | "actionable" | QuestDisplayStatus;

const modeLabels: Record<QuestGameMode, string> = {
  regular: "PVP",
  pve: "PVE",
  "pvp-season": "SEASONAL",
};

function mapLabel(mapId: string) {
  return gm(getMapDefinition(mapId)?.displayName ?? mapId.replaceAll("-", " "));
}

function profileLabel(profileKey: string) {
  return t("PROFILE {id}", { id: profileKey.slice(0, 8).toUpperCase() });
}

function displayStatusLabel(status: QuestDisplayStatus, isExplicit: boolean) {
  if (isExplicit) return t(status.toUpperCase());
  if (status === "unknown") return t("ELIGIBILITY UNKNOWN");
  return t("POSSIBLY {status}", { status: t(status.toUpperCase()) });
}

export function QuestPanel({
  open,
  mapId,
  onClose,
  onFocusObjective,
  onActiveObjectivePoisChange,
  onEnableQuestMarkersOnce,
  onImportComplete,
  onCatalogModeChange,
}: QuestPanelProps) {
  const language = useLanguage();
  const [mode, setMode] = useState<QuestGameMode>("regular");
  useEffect(() => {
    onCatalogModeChange?.(mode);
  }, [mode, onCatalogModeChange]);
  const [bundle, setBundle] = useState<QuestBundle | null>(null);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [profiles, setProfiles] = useState<QuestProfile[]>([]);
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | undefined>();
  const [followDetected, setFollowDetected] = useState(true);
  const followDetectedRef = useRef(true);
  const [levelDraft, setLevelDraft] = useState("");
  const [review, setReview] = useState<QuestSyncPreview | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [diagnosticCopied, setDiagnosticCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [showAllMaps, setShowAllMaps] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [traderFilter, setTraderFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    void Promise.all([getQuestProfiles(), getQuestSyncPreview()])
      .then(([nextProfiles, preview]) => {
        if (disposed) return;
        setProfiles(nextProfiles);
        const newest = nextProfiles
          .filter((profile) => profile.isCurrent)
          .sort((left, right) => right.lastSeen - left.lastSeen)[0];
        if (newest) {
          setMode(newest.gameMode);
          setSelectedProfileKey(newest.profileKey);
        }
        setReview(preview);
        setSyncEnabled(preview.enabled);
        setReviewOpen(preview.shouldReview);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason));
      });
    const interval = window.setInterval(() => {
      void syncQuestProgress()
        .then((result) => {
          if (disposed) return;
          setProfiles(result.profiles);
          if (followDetectedRef.current && result.detectedMode) {
            setMode(result.detectedMode);
            setSelectedProfileKey(
              result.profiles.find((profile) => profile.gameMode === result.detectedMode && profile.isCurrent)
                ?.profileKey,
            );
          }
          if (result.importedEvents > 0) {
            setSyncMessage(`${result.importedEvents} new log events imported`);
            setRefreshKey((current) => current + 1);
          }
        })
        .catch(() => undefined);
    }, 15_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  const modeProfiles = useMemo(() => profiles.filter((profile) => profile.gameMode === mode), [mode, profiles]);
  const selectedProfile = useMemo(
    () =>
      modeProfiles.find((profile) => profile.profileKey === selectedProfileKey) ??
      modeProfiles.find((profile) => profile.isCurrent) ??
      modeProfiles[0],
    [modeProfiles, selectedProfileKey],
  );

  useEffect(() => {
    setLevelDraft(selectedProfile?.playerLevel?.toString() ?? "");
  }, [selectedProfile]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    void Promise.all([loadQuestCatalog(mode), getQuestProgress(mode, selectedProfile?.profileKey)])
      .then(([nextBundle, nextProgress]) => {
        if (controller.signal.aborted) return;
        setBundle(nextBundle);
        setProgress(nextProgress);
        setExpanded(new Set());
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(String(reason));
      });
    return () => controller.abort();
  }, [mode, refreshKey, selectedProfile?.profileKey]);

  const progressIndex = useMemo(() => new Map(progress.map((entry) => [entry.taskId, entry])), [progress]);
  const questIndex = useMemo(() => new Map((bundle?.quests ?? []).map((quest) => [quest.id, quest])), [bundle]);
  const traders = useMemo(() => [...new Set((bundle?.quests ?? []).map((quest) => quest.traderName))].sort(), [bundle]);
  const playerLevel = selectedProfile?.playerLevel;
  const quests = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (bundle?.quests ?? [])
      .filter((quest) => showAllMaps || quest.mapIds.includes(mapId))
      .filter((quest) => traderFilter === "all" || quest.traderName === traderFilter)
      .filter((quest) => {
        const status = effectiveQuestStatus(quest, progressIndex, playerLevel, mode);
        return (
          statusFilter === "all" ||
          (statusFilter === "actionable" ? status === "active" || status === "available" : status === statusFilter)
        );
      })
      .filter(
        (quest) =>
          !needle ||
          quest.name.toLocaleLowerCase().includes(needle) ||
          chineseGameText(quest.name, `${quest.id} name`).toLocaleLowerCase().includes(needle) ||
          quest.traderName.toLocaleLowerCase().includes(needle) ||
          chineseGameText(quest.traderName, `${quest.traderId} Nickname`).toLocaleLowerCase().includes(needle) ||
          quest.summary.toLocaleLowerCase().includes(needle) ||
          localizeQuestSummary(quest).toLocaleLowerCase().includes(needle) ||
          quest.objectives.some(
            (objective) =>
              objective.description.toLocaleLowerCase().includes(needle) ||
              chineseGameText(objective.description, objective.id).toLocaleLowerCase().includes(needle),
          ),
      )
      .sort((left, right) => compareQuests(left, right, progressIndex, playerLevel, mode))
      .slice(0, 200);
  }, [bundle, language, mapId, mode, playerLevel, progressIndex, query, showAllMaps, statusFilter, traderFilter]);

  const activeObjectivePois = useMemo<QuestObjectivePoi[]>(
    () => buildActiveQuestObjectivePois(bundle?.gameMode === mode ? bundle : null, mapId, progressIndex),
    [bundle, mapId, mode, progressIndex],
  );

  useEffect(() => {
    onActiveObjectivePoisChange?.(activeObjectivePois);
  }, [activeObjectivePois, onActiveObjectivePoisChange]);

  function changeMode(nextMode: QuestGameMode) {
    if (nextMode === mode) return;
    setBundle(null);
    setProgress([]);
    setExpanded(new Set());
    setError(null);
    onActiveObjectivePoisChange?.([]);
    setMode(nextMode);
    followDetectedRef.current = false;
    setFollowDetected(false);
    setSelectedProfileKey(profiles.find((profile) => profile.gameMode === nextMode && profile.isCurrent)?.profileKey);
  }

  async function updateStatus(taskId: string, status: QuestStatus) {
    try {
      const next = await setQuestProgress(mode, taskId, status, selectedProfile?.profileKey);
      setProgress((current) => [...current.filter((entry) => entry.taskId !== taskId), next]);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function openLogReview() {
    if (!isTauriRuntime()) return;
    setSyncBusy(true);
    setReviewError(null);
    setDiagnosticCopied(false);
    try {
      const preview = await getQuestSyncPreview();
      setReview(preview);
      setSyncEnabled(preview.enabled);
      setReviewOpen(true);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSyncBusy(false);
    }
  }

  async function closeLogReview() {
    setReviewOpen(false);
    if (review?.fingerprint) await dismissQuestSyncPreview(review.fingerprint).catch(() => undefined);
  }

  async function confirmImport() {
    setSyncBusy(true);
    setReviewError(null);
    try {
      const result = await confirmQuestSync();
      setProfiles(result.profiles);
      if (result.detectedMode) {
        setMode(result.detectedMode);
        setSelectedProfileKey(
          result.profiles.find((profile) => profile.gameMode === result.detectedMode && profile.isCurrent)?.profileKey,
        );
      }
      followDetectedRef.current = true;
      setFollowDetected(true);
      if (result.enableQuestMarkers) onEnableQuestMarkersOnce?.();
      setSyncEnabled(true);
      setSyncMessage(`${result.importedEvents} new log events imported`);
      setRefreshKey((current) => current + 1);
      setReviewOpen(false);
      onImportComplete?.();
    } catch (reason) {
      setReviewError(String(reason));
    } finally {
      setSyncBusy(false);
    }
  }

  async function copyDiagnostics() {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(questDiagnosticSummary(review));
      setDiagnosticCopied(true);
      setReviewError(null);
    } catch (reason) {
      setReviewError(`Diagnostics could not be copied: ${String(reason)}`);
    }
  }

  async function savePlayerLevel() {
    if (!selectedProfile) return;
    const parsed = levelDraft.trim() === "" ? null : Number(levelDraft);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 79)) {
      setError("Player level must be between 1 and 79.");
      return;
    }
    try {
      const updated = await setQuestPlayerLevel(mode, selectedProfile.profileKey, parsed);
      setProfiles((current) =>
        current.map((profile) =>
          profile.profileKey === updated.profileKey && profile.gameMode === updated.gameMode ? updated : profile,
        ),
      );
      setError(null);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function pauseAutomaticSync() {
    setSyncBusy(true);
    try {
      await setQuestSyncEnabled(false);
      setSyncEnabled(false);
      setSyncMessage("automatic log sync paused");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSyncBusy(false);
    }
  }

  function followCurrentProfile() {
    const newest = profiles
      .filter((profile) => profile.isCurrent)
      .sort((left, right) => right.lastSeen - left.lastSeen)[0];
    followDetectedRef.current = true;
    setFollowDetected(true);
    if (newest) {
      setMode(newest.gameMode);
      setSelectedProfileKey(newest.profileKey);
    }
  }

  function toggleExpanded(taskId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <>
      {reviewOpen && review && (
        <Dialog className="quest-review-dialog" titleId="quest-review-title" onClose={() => void closeLogReview()}>
          <header>
            <div>
              <span className="kicker">{t("LOCAL QUEST LOG REVIEW")}</span>
              <h2 id="quest-review-title">{t("Import detected quest progress?")}</h2>
            </div>
            <button
              className="bare-icon"
              onClick={() => void closeLogReview()}
              aria-label={t("Close quest log review")}
            >
              <UiIcon name="close" />
            </button>
          </header>
          <div className="quest-review-body">
            <div className="quest-experimental-notice">
              <strong>{t("EXPERIMENTAL LOG COMPATIBILITY")}</strong>
              <p>
                {t(
                  "Tarkov builds do not always retain a supported quest-event format. Raid Signal imports only explicit, safely attributed records and never guesses from lifecycle traces or unrelated IDs.",
                )}
              </p>
            </div>
            <p>{localizeMessage(review.message)}</p>
            <p>
              {t(
                "Raid Signal reads supported quest notifications from your local Tarkov logs. Profile IDs are one-way hashed before storage; log contents and quest progress never go to the relay or phone companion.",
              )}
            </p>
            <div className="quest-review-stats">
              <span>
                {review.eventCount} {t("EVENTS")}
              </span>
              <span>
                {review.profiles.length} {t("PROFILES")}
              </span>
              <span>
                {review.sessionsScanned} {t("SESSIONS")}
              </span>
              <span>
                {review.filesScanned} {t("FILES")}
              </span>
            </div>
            <p className="field-help">
              {review.notificationFilesScanned} {t("notification ·")} {review.outputFilesScanned} {t("output ·")}{" "}
              {review.chatMessageMarkers} {t("recognized format markers ·")} {review.lifecycleHints}{" "}
              {t("non-authoritative lifecycle hints")}
            </p>
            {review.profiles.map((profile) => (
              <article key={`${profile.gameMode}:${profile.profileKey}`}>
                <strong>{profileLabel(profile.profileKey)}</strong>
                <span>
                  {t(modeLabels[profile.gameMode])}
                  {profile.isCurrent ? t(" · CURRENT") : t(" · OLDER")}
                </span>
                <small>
                  {profile.startedCount} {t("started ·")} {profile.completedCount} {t("completed ·")}{" "}
                  {profile.failedCount} {t("failed")}
                </small>
              </article>
            ))}
            {(review.suspiciousSessions > 0 || review.unattributedRecords > 0 || review.malformedRecords > 0) && (
              <div className="quest-review-warning">
                {review.suspiciousSessions > 0 && (
                  <p>
                    {review.suspiciousSessions}{" "}
                    {t("session(s) contained a suspicious start burst; those start events will be quarantined.")}
                  </p>
                )}
                {review.unattributedRecords > 0 && (
                  <p>
                    {review.unattributedRecords}{" "}
                    {t("event(s) could not be safely tied to a profile and mode and will be skipped.")}
                  </p>
                )}
                {review.malformedRecords > 0 && (
                  <p>
                    {review.malformedRecords} {t("malformed or unsupported record(s) will be skipped.")}
                  </p>
                )}
              </div>
            )}
            <p className="field-help">
              {t(
                "Newest events win, including later manual corrections. Existing v1.2 manual progress is attached to each detected current profile during this first import.",
              )}
            </p>
            {!review.available && (
              <div className="quest-review-warning">
                <p>{t("No supported quest events are available to import, so marker import is disabled.")}</p>
                <p>
                  {t(
                    "Copy the privacy-safe summary and submit a compatibility report. It contains no paths, IDs, timestamps, or log contents.",
                  )}
                </p>
                <a href={questCompatibilityIssueUrl} target="_blank" rel="noreferrer">
                  {t("OPEN COMPATIBILITY REPORT ↗")}
                </a>
              </div>
            )}
            {reviewError && <p className="error-box">{localizeMessage(reviewError)}</p>}
            {diagnosticCopied && <p className="success-box">{t("Privacy-safe diagnostics copied.")}</p>}
          </div>
          <footer>
            <button className="secondary" onClick={() => void copyDiagnostics()} disabled={syncBusy}>
              {t("COPY DIAGNOSTICS")}
            </button>
            <button className="secondary" onClick={() => void closeLogReview()} disabled={syncBusy}>
              {t("NOT NOW")}
            </button>
            <button className="primary" onClick={() => void confirmImport()} disabled={syncBusy || !review.available}>
              {syncBusy
                ? t("IMPORTING…")
                : review.available
                  ? t("IMPORT AND ENABLE MARKERS")
                  : t("NO EVENTS TO IMPORT")}
            </button>
          </footer>
        </Dialog>
      )}

      {open && !reviewOpen && (
        <Dialog className="quest-dialog" titleId="quest-title" onClose={onClose}>
          <header>
            <div>
              <span className="kicker">{t("OFFLINE RAID PLANNING")}</span>
              <h2 id="quest-title">{t("Quest navigator")}</h2>
            </div>
            <button className="bare-icon" onClick={onClose} aria-label={t("Close quests")}>
              <UiIcon name="close" />
            </button>
          </header>
          <div className="quest-toolbar">
            <div className="segmented">
              {(Object.keys(modeLabels) as QuestGameMode[]).map((value) => (
                <button className={mode === value ? "active" : ""} onClick={() => changeMode(value)} key={value}>
                  {t(modeLabels[value])}
                </button>
              ))}
            </div>
            <label className="intel-search">
              <UiIcon name="search" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search quests, traders, objectives")}
              />
            </label>
            <label className="compact-check">
              <input type="checkbox" checked={showAllMaps} onChange={(event) => setShowAllMaps(event.target.checked)} />{" "}
              {t("All maps")}
            </label>
            <label className="quest-filter">
              <span>{t("STATUS")}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">{t("ALL · ACTIONABLE FIRST")}</option>
                <option value="actionable">{t("ACTIONABLE ONLY")}</option>
                <option value="unknown">{t("ELIGIBILITY UNKNOWN")}</option>
                {questStatuses.map((status) => (
                  <option value={status} key={status}>
                    {t(status.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>
            <label className="quest-filter">
              <span>{t("TRADER")}</span>
              <select value={traderFilter} onChange={(event) => setTraderFilter(event.target.value)}>
                <option value="all">{t("ALL TRADERS")}</option>
                {traders.map((trader) => (
                  <option value={trader} key={trader}>
                    {g(trader, `${bundle?.quests.find((quest) => quest.traderName === trader)?.traderId} Nickname`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="quest-experimental-notice quest-experimental-notice--panel">
            <strong>{t("EXPERIMENTAL LOG IMPORT")}</strong>
            <p>
              {t(
                "Current Tarkov builds may not retain recognized quest events. Manual quest tracking remains available; automatic import never infers progress from ambiguous log lines.",
              )}
            </p>
          </div>
          <div className="quest-profile-bar">
            {isTauriRuntime() ? (
              <>
                <label>
                  <span>{t("PROFILE")}</span>
                  <select
                    value={selectedProfile?.profileKey ?? ""}
                    onChange={(event) => {
                      setSelectedProfileKey(event.target.value || undefined);
                      followDetectedRef.current = false;
                      setFollowDetected(false);
                    }}
                  >
                    {!modeProfiles.length && <option value="">{t("NO DETECTED PROFILE")}</option>}
                    {modeProfiles.map((profile) => (
                      <option key={profile.profileKey} value={profile.profileKey}>
                        {profileLabel(profile.profileKey)}
                        {profile.isCurrent ? t(" · CURRENT") : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>
                    {t("PLAYER LEVEL")}{" "}
                    <i
                      title={t(
                        "Optional. Used only for possibly locked/available labels; quest events remain authoritative.",
                      )}
                    >
                      ?
                    </i>
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="79"
                    value={levelDraft}
                    onChange={(event) => setLevelDraft(event.target.value)}
                    placeholder={t("OPTIONAL")}
                  />
                </label>
                <button onClick={() => void savePlayerLevel()} disabled={!selectedProfile}>
                  {t("SAVE LEVEL")}
                </button>
                <button onClick={followCurrentProfile} disabled={followDetected}>
                  {followDetected ? t("FOLLOWING CURRENT") : t("FOLLOW CURRENT")}
                </button>
                {syncEnabled ? (
                  <button onClick={() => void pauseAutomaticSync()} disabled={syncBusy}>
                    {t("PAUSE LOG SYNC")}
                  </button>
                ) : (
                  <button onClick={() => void openLogReview()} disabled={syncBusy}>
                    {syncBusy ? t("SCANNING LOGS…") : t("REVIEW LOG IMPORT")}
                  </button>
                )}
              </>
            ) : (
              <span>{t("Phone companion progress is manual and stays on this device.")}</span>
            )}
          </div>
          <div className="quest-result-bar">
            <span>
              {t("{count} QUESTS", { count: quests.length })}
              {syncMessage ? ` · ${localizeMessage(syncMessage).toUpperCase()}` : ""}
            </span>
            <b>{showAllMaps ? t("ALL LOCATIONS") : mapLabel(mapId)}</b>
          </div>
          {mode === "pvp-season" && (
            <p className="quest-advisory">
              {t(
                "Seasonal quest eligibility is not reliably present in logs. Unsaved quests stay “eligibility unknown”; explicit started/completed/failed events remain authoritative.",
              )}
            </p>
          )}
          {error && <p className="error-box">{localizeMessage(error)}</p>}
          <div className="quest-list">
            {quests.map((quest) => {
              const explicit = progressIndex.get(quest.id);
              const status = effectiveQuestStatus(quest, progressIndex, playerLevel, mode);
              const isExpanded = expanded.has(quest.id);
              return (
                <article className={`quest-card ${status}`} key={quest.id}>
                  <header>
                    <button
                      className="quest-expand"
                      onClick={() => toggleExpanded(quest.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>
                        {g(quest.traderName, `${quest.traderId} Nickname`)} ·{" "}
                        {quest.minPlayerLevel > 0
                          ? t("LEVEL {level}", { level: quest.minPlayerLevel })
                          : t("ANY LEVEL")}{" "}
                        {t("· CHAIN")} {quest.chainDepth + 1}
                      </span>
                      <strong>{g(quest.name, `${quest.id} name`) || t("Unknown quest")}</strong>
                      <small>{localizeQuestSummary(quest)}</small>
                    </button>
                    <select
                      value={explicit?.status ?? ""}
                      aria-label={t("Status for {name}", { name: g(quest.name, `${quest.id} name`) })}
                      onChange={(event) => void updateStatus(quest.id, event.target.value as QuestStatus)}
                    >
                      <option value="" disabled>
                        {t("AUTO ·")} {displayStatusLabel(status, false)}
                      </option>
                      {questStatuses.map((value) => (
                        <option key={value} value={value}>
                          {t(value.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </header>
                  <div className="quest-map-tags">
                    {quest.mapIds.length ? (
                      quest.mapIds.map((questMapId) => (
                        <button
                          className={questMapId === mapId ? "active" : ""}
                          key={questMapId}
                          onClick={() => onFocusObjective(questMapId, null)}
                        >
                          {mapLabel(questMapId)}
                        </button>
                      ))
                    ) : (
                      <span>{t("LOCATION NOT SPECIFIED")}</span>
                    )}
                    {explicit?.source && <em>{explicit.source === "logs" ? t("LOG") : t("MANUAL")}</em>}
                    <i
                      title={
                        explicit
                          ? t("Explicit progress event")
                          : t(
                              "Derived from known prerequisites and optional player level; trader state and other eligibility conditions may be missing.",
                            )
                      }
                    >
                      {displayStatusLabel(status, Boolean(explicit))}
                    </i>
                  </div>
                  {isExpanded && (
                    <div className="quest-details">
                      {quest.requirements.length > 0 && (
                        <section>
                          <h4>{t("PREREQUISITES")}</h4>
                          <p>
                            {quest.requirements
                              .map(
                                (requirement) =>
                                  g(questIndex.get(requirement.taskId)?.name, `${requirement.taskId} name`) ||
                                  t("Unknown quest"),
                              )
                              .join(" · ")}
                          </p>
                        </section>
                      )}
                      <section>
                        <h4>{t("WHAT TO DO")}</h4>
                        {quest.objectives.map((objective, objectiveIndex) => {
                          const navigableMaps = objective.mapIds.length ? objective.mapIds : quest.mapIds;
                          return (
                            <div className="quest-objective-row" key={objective.id}>
                              <div>
                                <b>{String(objectiveIndex + 1).padStart(2, "0")}</b>
                                <span>{localizeGameText(objective.description, objective.id)}</span>
                                {objective.details.map((detail) => (
                                  <small key={detail}>{localizeGameText(detail)}</small>
                                ))}
                              </div>
                              <div className="quest-objective-actions">
                                {navigableMaps.map((objectiveMapId) => {
                                  const zone = objective.zones.find((candidate) => candidate.mapId === objectiveMapId);
                                  // Find-item objectives have no zone, so fall back to the first candidate point.
                                  const candidate = zone
                                    ? null
                                    : objective.possibleLocations.find(
                                        (location) => location.mapId === objectiveMapId && location.positions.length,
                                      );
                                  const shared = {
                                    id: `quest-${quest.id}-${objective.id}-${objectiveMapId}`,
                                    category: "quest-objective" as const,
                                    mapId: objectiveMapId,
                                    name: quest.name,
                                    aliases: [objective.description],
                                    description: objective.description,
                                    taskId: quest.id,
                                    objectiveId: objective.id,
                                  };
                                  const poi = zone
                                    ? {
                                        ...shared,
                                        kind: "quest-objective" as const,
                                        position: zone.position,
                                        outline: zone.outline,
                                        top: zone.top,
                                        bottom: zone.bottom,
                                      }
                                    : candidate
                                      ? {
                                          ...shared,
                                          kind: "quest-possible-location" as const,
                                          position: candidate.positions[0],
                                          locationIndex: 0,
                                          locationCount: candidate.positions.length,
                                        }
                                      : null;
                                  return (
                                    <button key={objectiveMapId} onClick={() => onFocusObjective(objectiveMapId, poi)}>
                                      {zone ? t("SHOW POINT") : candidate ? t("SHOW AREA") : t("VIEW")} ·{" "}
                                      {mapLabel(objectiveMapId)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                      {quest.rewardSummary.length > 0 && (
                        <section>
                          <h4>{t("REWARDS")}</h4>
                          <div className="quest-rewards">
                            {quest.rewardSummary.map((reward) => (
                              <span key={reward}>{localizeGameText(reward)}</span>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {!quests.length && !error && <p className="drawer-message">{t("No quests match the current filters.")}</p>}
          </div>
        </Dialog>
      )}
    </>
  );
}
