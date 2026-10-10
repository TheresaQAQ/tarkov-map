import { t } from "../i18n";
import { useLanguage } from "../use-language";
import { Dialog } from "./Dialog";
import { UiIcon } from "./Icons";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  useLanguage();
  return (
    <Dialog className="about-dialog" titleId="about-title" onClose={onClose}>
      <header>
        <div>
          <span className="kicker">{t("ABOUT")}</span>
          <h2 id="about-title">Raid Signal</h2>
        </div>
        <button className="bare-icon" onClick={onClose} aria-label={t("Close")}>
          <UiIcon name="close" />
        </button>
      </header>
      <p>
        {t(
          "This app reads filenames and logs written by Escape from Tarkov. It never reads game memory, injects input, or modifies game files. No official approval or anti-cheat guarantee is implied.",
        )}
      </p>
      <h3>{t("MAP AND INTELLIGENCE DATA")}</h3>
      <p>
        {t(
          "Map metadata, coordinates, extracts, and points of interest are based on the MIT-licensed Tarkov.dev project. Community map artwork is provided under CC BY-NC-SA 4.0. Raid Signal is free and noncommercial.",
        )}
      </p>
      <div className="license-links">
        <a href="https://github.com/QTtrash/tarkov-map" target="_blank" rel="noreferrer">
          {t("RAID SIGNAL SOURCE")}
        </a>
        <a href="https://github.com/QTtrash/tarkov-map/blob/main/LICENSE" target="_blank" rel="noreferrer">
          {t("APACHE-2.0 CODE")}
        </a>
        <a href="https://github.com/QTtrash/tarkov-map/blob/main/PRIVACY.md" target="_blank" rel="noreferrer">
          {t("PRIVACY POLICY")}
        </a>
        <a href="https://github.com/the-hideout/tarkov-dev" target="_blank" rel="noreferrer">
          {t("TARKOV.DEV SOURCE")}
        </a>
        <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noreferrer">
          {t("MAP ARTWORK")}
        </a>
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-NC-SA 4.0
        </a>
      </div>
    </Dialog>
  );
}
