import { localizeMessage, t } from "../i18n";
import { useLanguage } from "../use-language";
import { useEffect, useRef, useState } from "react";
import { isTauriRuntime, readLatestScreenshot, resetOverlayWindow } from "../locator";
import type { MapSessionState } from "../map-session";
import type { LocatorSettings, LocatorStatus, OverlayState, RaidExtractState } from "../types";
import { LanguageSelect } from "./LanguageSelect";
import { Dialog } from "./Dialog";
import { UiIcon } from "./Icons";

interface SettingsDialogProps {
  settings: LocatorSettings;
  status: LocatorStatus;
  mapSession: MapSessionState;
  overlayState: OverlayState;
  dataGeneratedAt: string | null;
  raidExtracts: RaidExtractState | null;
  onClose: () => void;
  onBrowse: (kind: "screenshots" | "logs") => Promise<void>;
  onOpenDirectory: (kind: "screenshots" | "logs") => Promise<void>;
  onRescanDirectories: () => Promise<void>;
  onReviewQuestLogs: () => void;
  onUpdateSettings: (patch: Partial<LocatorSettings>) => void;
  onOverlayAction: (action: () => Promise<void>, failureMessage: string) => Promise<void>;
}

export function SettingsDialog({
  settings,
  status,
  mapSession,
  overlayState,
  dataGeneratedAt,
  raidExtracts,
  onClose,
  onBrowse,
  onOpenDirectory,
  onRescanDirectories,
  onReviewQuestLogs,
  onUpdateSettings,
  onOverlayAction,
}: SettingsDialogProps) {
  const language = useLanguage();
  const [rescanState, setRescanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [rescanMessage, setRescanMessage] = useState<string | null>(null);
  const rescanBaseline = useRef<LocatorStatus | null>(null);

  useEffect(() => {
    if (rescanState !== "scanning" || !rescanBaseline.current || status === rescanBaseline.current) return;
    setRescanState(status.level === "error" ? "error" : "success");
    setRescanMessage(status.level === "error" ? (status.lastError ?? status.message) : "Folder paths refreshed");
  }, [rescanState, status]);

  async function rescan() {
    rescanBaseline.current = status;
    setRescanState("scanning");
    setRescanMessage("Checking configured and automatically detected folders…");
    try {
      await onRescanDirectories();
    } catch (error) {
      setRescanState("error");
      setRescanMessage(String(error));
    }
  }

  return (
    <Dialog className="settings-dialog" titleId="settings-title" onClose={onClose}>
      <header>
        <div>
          <span className="kicker">{t("SYSTEM CONFIGURATION")}</span>
          <h2 id="settings-title">{t("Raid Signal settings")}</h2>
        </div>
        <button className="bare-icon" onClick={onClose} aria-label={t("Close")}>
          <UiIcon name="close" />
        </button>
      </header>
      <div className="dialog-section">
        <h3>{t("DATA SOURCES")}</h3>
        <p>{t("The locator reads files created by Tarkov. No game memory or network connection is used.")}</p>
        <button className="folder-row" onClick={() => void onBrowse("screenshots")}>
          <UiIcon name="folder" />
          <span>
            <b>{t("SCREENSHOTS")}</b>
            <small>{status.screenshotsDir ?? t("Folder not detected")}</small>
          </span>
          <strong>{t("BROWSE")}</strong>
        </button>
        {status.screenshotsDir && (
          <button className="inline-action" onClick={() => void onOpenDirectory("screenshots")}>
            {t("OPEN SCREENSHOTS FOLDER")}
          </button>
        )}
        <button className="folder-row" onClick={() => void onBrowse("logs")}>
          <UiIcon name="folder" />
          <span>
            <b>{t("CONFIGURED LOGS ROOT")}</b>
            <small>{settings.logsDir ?? t("Automatic detection")}</small>
          </span>
          <strong>{t("BROWSE")}</strong>
        </button>
        {status.logsDir && (
          <div className="resolved-folder">
            <span>{t("ACTIVE SESSION")}</span>
            <code>{status.logsDir}</code>
          </div>
        )}
        {settings.logsDir && (
          <button className="inline-action" onClick={() => void onOpenDirectory("logs")}>
            {t("OPEN CONFIGURED LOGS ROOT")}
          </button>
        )}
        <button className="dialog-button" onClick={() => void rescan()} disabled={rescanState === "scanning"}>
          {rescanState === "scanning" ? t("SCANNING FOLDERS…") : t("RESCAN FOLDERS")}
        </button>
        {rescanMessage && <p className={`rescan-result ${rescanState}`}>{localizeMessage(rescanMessage)}</p>}
        <p className="field-help">
          {t("Folder rescan updates data-source detection. Quest records are scanned separately.")}
        </p>
        <button className="dialog-button secondary" onClick={onReviewQuestLogs}>
          {t("REVIEW QUEST LOGS")}
        </button>
        <button className="dialog-button secondary" onClick={() => void readLatestScreenshot()}>
          {t("READ LATEST SCREENSHOT")}
        </button>
      </div>
      <div className="dialog-section">
        <h3>{t("FILE HANDLING & DISPLAY")}</h3>
        <div className="switch-row">
          <b>{t("Language")}</b>
          <LanguageSelect />
        </div>
        <label className="switch-row">
          <span>
            <b>{t("Delete parsed screenshots")}</b>
            <small>{t("Disabled by default. Invalid and older files are never removed.")}</small>
          </span>
          <input
            type="checkbox"
            checked={settings.deleteParsedScreenshots}
            onChange={(event) => onUpdateSettings({ deleteParsedScreenshots: event.target.checked })}
          />
        </label>
        <label className="switch-row">
          <span>
            <b>{t("High contrast")}</b>
            <small>{t("Improves text and control contrast without changing map data.")}</small>
          </span>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(event) => onUpdateSettings({ highContrast: event.target.checked })}
          />
        </label>
        <label className="range-row">
          <span>
            <b>{t("Overlay opacity")}</b>
            <small>{t("Ctrl+Shift+M toggles the overlay; Ctrl+Shift+X restores clicks.")}</small>
          </span>
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.05"
            value={settings.overlayOpacity}
            onChange={(event) => onUpdateSettings({ overlayOpacity: Number(event.target.value) })}
          />
          <output>{Math.round(settings.overlayOpacity * 100)}%</output>
        </label>
        <button
          className="dialog-button secondary"
          onClick={() => void onOverlayAction(resetOverlayWindow, t("Overlay could not be reset"))}
        >
          {t("RESET & SHOW OVERLAY")}
        </button>
      </div>
      <div className="dialog-section diagnostics">
        <h3>{t("DIAGNOSTICS")}</h3>
        <dl className="telemetry-list">
          <div>
            <dt>{t("RUNTIME")}</dt>
            <dd>{isTauriRuntime() ? t("TAURI DESKTOP") : t("BROWSER PREVIEW")}</dd>
          </div>
          <div>
            <dt>{t("RAID STATE")}</dt>
            <dd>{mapSession.inRaid ? t("IN RAID") : t("NOT DETECTED")}</dd>
          </div>
          <div>
            <dt>{t("MAP SOURCE")}</dt>
            <dd>{t(mapSession.source.toUpperCase())}</dd>
          </div>
          <div>
            <dt>{t("VIEW MODE")}</dt>
            <dd>{mapSession.browsingAway ? t("BROWSING AWAY") : t("FOLLOWING RAID")}</dd>
          </div>
          <div>
            <dt>{t("OVERLAY")}</dt>
            <dd>
              {overlayState.visible ? (overlayState.clickThrough ? t("CLICK-THROUGH") : t("INTERACTIVE")) : t("HIDDEN")}
            </dd>
          </div>
          <div>
            <dt>{t("SHORTCUTS")}</dt>
            <dd>{overlayState.shortcutReady ? t("READY") : t("UNAVAILABLE")}</dd>
          </div>
          <div>
            <dt>{t("LAST FILE")}</dt>
            <dd title={status.lastFilename ?? ""}>{status.lastFilename ?? "-"}</dd>
          </div>
          <div>
            <dt>{t("INTEL BUILD")}</dt>
            <dd>
              {dataGeneratedAt
                ? new Date(dataGeneratedAt).toLocaleDateString(language === "en" ? "en-US" : "zh-CN")
                : t("UNKNOWN")}
            </dd>
          </div>
          <div>
            <dt>{t("EXTRACT OCR")}</dt>
            <dd>{t(raidExtracts?.status.toUpperCase() ?? "UNKNOWN")}</dd>
          </div>
        </dl>
        <p className={`diagnostic-status ${status.level}`}>{localizeMessage(status.message)}</p>
        {(overlayState.lastError || status.lastError) && (
          <p className="error-box">{localizeMessage(overlayState.lastError ?? status.lastError)}</p>
        )}
      </div>
    </Dialog>
  );
}
