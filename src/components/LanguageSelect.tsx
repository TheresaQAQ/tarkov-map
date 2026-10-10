import { setLanguage, t } from "../i18n";
import { useLanguage } from "../use-language";

export function LanguageSelect() {
  const language = useLanguage();
  return (
    <label className="language-select">
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={language}
        onChange={(event) => {
          if (event.target.value === "zh-CN" || event.target.value === "en") setLanguage(event.target.value);
        }}
      >
        <option value="zh-CN">简体中文</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
