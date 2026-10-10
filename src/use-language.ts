import { useEffect, useSyncExternalStore } from "react";
import { getLanguage, subscribeLanguage, t } from "./i18n";

const originalTitle = document.title;

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "zh-CN" as const);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t(originalTitle);
  }, [language]);
  return language;
}
