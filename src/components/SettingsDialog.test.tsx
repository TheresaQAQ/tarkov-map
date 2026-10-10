import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../locator";
import type { LocatorStatus } from "../types";
import { SettingsDialog } from "./SettingsDialog";
import { languageStorageKey, setLanguage } from "../i18n";

const status: LocatorStatus = {
  level: "info",
  message: "Raid detection connected",
  screenshotsDir: null,
  logsDir: "D:\\EFT\\Logs\\log_2026.08.22_current",
  screenshotWatcherReady: false,
  logWatcherReady: true,
  lastFilename: null,
  lastError: null,
};

function props(overrides: Record<string, unknown> = {}) {
  return {
    settings: { ...defaultSettings, logsDir: "D:\\EFT\\Logs" },
    status,
    mapSession: {
      viewedMapId: "customs",
      detectedMapId: null,
      inRaid: false,
      source: "manual" as const,
      browsingAway: false,
    },
    overlayState: { visible: false, ready: false, clickThrough: false, shortcutReady: true, lastError: null },
    dataGeneratedAt: null,
    raidExtracts: null,
    onClose: vi.fn(),
    onBrowse: vi.fn(async () => undefined),
    onOpenDirectory: vi.fn(async () => undefined),
    onRescanDirectories: vi.fn(async () => undefined),
    onReviewQuestLogs: vi.fn(),
    onUpdateSettings: vi.fn(),
    onOverlayAction: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("SettingsDialog", () => {
  afterEach(cleanup);

  it("distinguishes the configured logs root from the active session", () => {
    render(<SettingsDialog {...props()} />);
    expect(screen.getByText("D:\\EFT\\Logs")).toBeVisible();
    expect(screen.getByText("D:\\EFT\\Logs\\log_2026.08.22_current")).toBeVisible();
    expect(screen.getByText("ACTIVE SESSION")).toBeVisible();
  });

  it("shows folder rescan progress and completion", async () => {
    const initial = props();
    const view = render(<SettingsDialog {...initial} />);
    fireEvent.click(screen.getByRole("button", { name: "RESCAN FOLDERS" }));
    expect(screen.getByRole("button", { name: "SCANNING FOLDERS…" })).toBeDisabled();

    view.rerender(<SettingsDialog {...initial} status={{ ...status, message: "Locator paths refreshed" }} />);
    await waitFor(() => expect(screen.getByText("Folder paths refreshed")).toBeVisible());
  });

  it("switches the open dialog immediately and keeps the settings v2 payload intact", () => {
    setLanguage("zh-CN");
    const initial = props();
    render(<SettingsDialog {...initial} />);
    expect(screen.getByRole("dialog", { name: "Raid Signal 设置" })).toBeVisible();
    expect(screen.getByText("战局识别已连接")).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "语言" }), { target: { value: "en" } });
    expect(screen.getByRole("dialog", { name: "Raid Signal settings" })).toBeVisible();
    expect(screen.getByText("Raid detection connected")).toBeVisible();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(languageStorageKey)).toBe("en");
    expect(initial.onUpdateSettings).not.toHaveBeenCalled();
    expect(initial.settings.schemaVersion).toBe(2);
  });
});
