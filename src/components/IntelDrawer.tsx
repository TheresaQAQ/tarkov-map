import { categoryLabel, localizeMessage, t, g, poiName, chinesePoiName } from "../i18n";
import { useLanguage } from "../use-language";
import { useMemo, useState } from "react";
import {
  countLootGroups,
  defaultVisiblePoiCategories,
  lootGroupDefinitions,
  nearestExtracts,
  poiCategoryGroups,
  searchPois,
} from "../poi";
import type { LootGroupId, MapDefinition, MapPoiBundle, PlayerFix, PoiCategory, RaidExtractState } from "../types";
import { LootGroupGlyph, PoiGlyph, UiIcon } from "./Icons";

interface IntelDrawerProps {
  definition: MapDefinition;
  bundle: MapPoiBundle | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  visible: Set<PoiCategory>;
  visibleLootGroups: ReadonlySet<LootGroupId>;
  fix: PlayerFix | null;
  raidExtracts?: RaidExtractState | null;
  showQuestMarkers: boolean;
  activeQuestCount: number;
  onOpenChange: (open: boolean) => void;
  onToggle: (category: PoiCategory) => void;
  onToggleLootGroup: (group: LootGroupId) => void;
  onToggleQuestMarkers: () => void;
  onHideAll: () => void;
  onSetVisible: (categories: PoiCategory[]) => void;
  onFocusPoi: (id: string) => void;
}

export function IntelDrawer({
  definition,
  bundle,
  loading,
  error,
  open,
  visible,
  visibleLootGroups,
  fix,
  raidExtracts = null,
  showQuestMarkers,
  activeQuestCount,
  onOpenChange,
  onToggle,
  onToggleLootGroup,
  onToggleQuestMarkers,
  onHideAll,
  onSetVisible,
  onFocusPoi,
}: IntelDrawerProps) {
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      searchPois(
        (bundle?.pois ?? []).map((poi) => ({ ...poi, aliases: [...(poi.aliases ?? []), chinesePoiName(poi)] })),
        query,
      ),
    [bundle, language, query],
  );
  const lootCounts = useMemo(() => countLootGroups(bundle?.pois ?? []), [bundle]);
  const nearest = useMemo(
    () =>
      fix && bundle
        ? nearestExtracts(
            bundle.pois,
            fix.position,
            3,
            raidExtracts?.status === "recognized" ? new Set(raidExtracts.activeExtractIds) : undefined,
          )
        : [],
    [bundle, fix, raidExtracts],
  );

  return (
    <aside className={open ? "intel-shell open" : "intel-shell"} aria-label={t("Map intelligence")}>
      <nav className="intel-rail" aria-label={t("Map tools")}>
        <button
          className={open ? "rail-button active" : "rail-button"}
          onClick={() => onOpenChange(!open)}
          aria-label={open ? t("Close map legend") : t("Open map legend")}
          title={t("Map intelligence")}
        >
          <UiIcon name="layers" />
          <span>{t("Intel")}</span>
        </button>
      </nav>

      {open && (
        <div className="intel-drawer">
          <header className="drawer-header">
            <div>
              <span className="kicker">{t("MAP INTELLIGENCE")}</span>
              <h2>{t("Legend")}</h2>
            </div>
            <button className="bare-icon" onClick={() => onOpenChange(false)} aria-label={t("Close map legend")}>
              <UiIcon name="close" />
            </button>
          </header>

          <label className="intel-search">
            <UiIcon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Find an extract or location")}
            />
          </label>

          {query.trim() && (
            <section className="search-results" aria-label={t("Search results")}>
              {results.length ? (
                results.map((poi) => (
                  <button key={poi.id} onClick={() => onFocusPoi(poi.id)}>
                    <PoiGlyph category={poi.category} size={15} />
                    <span>
                      {poiName(poi)}
                      <small>{categoryLabel(poi.category)}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p>{t("No matching map locations")}</p>
              )}
            </section>
          )}

          {!query.trim() && fix && nearest.length > 0 && (
            <section className="nearest-section">
              <div className="drawer-section-title">
                <span>
                  {raidExtracts?.status === "recognized"
                    ? t("Nearest active extracts")
                    : t("Nearest possible extracts")}
                </span>
                <small>{t("Direct distance")}</small>
              </div>
              {nearest.map(({ poi, distance }, index) => (
                <button className="nearest-row" key={poi.id} onClick={() => onFocusPoi(poi.id)}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>
                    {poiName(poi)}
                    <small>{poi.category.replace("extract-", "").toUpperCase()}</small>
                  </span>
                  <strong>{Math.round(distance)} m</strong>
                </button>
              ))}
            </section>
          )}

          {!query.trim() && (
            <section
              className={raidExtracts?.status === "recognized" ? "raid-intel recognized" : "raid-intel"}
              aria-live="polite"
            >
              <div className="drawer-section-title">
                <span>{t("Raid availability")}</span>
                <small>
                  {raidExtracts?.status === "recognized"
                    ? t("{count}% confidence", { count: Math.round(raidExtracts.confidence * 100) })
                    : t("Unknown")}
                </small>
              </div>
              {raidExtracts?.status === "recognized" ? (
                <>
                  <strong>
                    {t("{count} active raid options recognized", { count: raidExtracts.activeExtractIds.length })}
                  </strong>
                  <p>{raidExtracts.recognizedNames.map((name) => g(name)).join(" · ")}</p>
                </>
              ) : (
                <>
                  <strong>{t("Active exits not confirmed")}</strong>
                  <p>{t("Press O in raid, keep the extraction panel visible, then take a screenshot.")}</p>
                </>
              )}
            </section>
          )}

          <div className="legend-actions">
            <button onClick={() => onSetVisible(defaultVisiblePoiCategories)}>{t("Recommended")}</button>
            <button onClick={onHideAll}>{t("Hide all")}</button>
          </div>

          <div className="legend-groups">
            {poiCategoryGroups.map((group) => {
              const available = group.categories.filter((category) => (definition.poiCounts[category.id] ?? 0) > 0);
              if (!available.length && group.id !== "utility") return null;
              return (
                <section className="legend-group" key={group.id}>
                  <h3>{t(group.name)}</h3>
                  {group.id === "utility" && (
                    <button
                      className={showQuestMarkers ? "legend-row quest-objective enabled" : "legend-row quest-objective"}
                      onClick={onToggleQuestMarkers}
                      aria-pressed={showQuestMarkers}
                    >
                      <span className="legend-symbol">
                        <PoiGlyph category="quest-objective" />
                      </span>
                      <span>{t("Quest markers")}</span>
                      <b>{activeQuestCount}</b>
                      <i aria-hidden="true" />
                    </button>
                  )}
                  {available.map((category) => (
                    <div
                      className={category.id === "loot" ? "legend-category-with-children" : undefined}
                      key={category.id}
                    >
                      <button
                        className={
                          visible.has(category.id) ? `legend-row ${category.id} enabled` : `legend-row ${category.id}`
                        }
                        aria-pressed={visible.has(category.id)}
                        onClick={() => onToggle(category.id)}
                      >
                        <span className="legend-symbol">
                          <PoiGlyph category={category.id} />
                        </span>
                        <span>{t(category.name)}</span>
                        <b>{definition.poiCounts[category.id]}</b>
                        <i aria-hidden="true" />
                      </button>
                      {category.id === "loot" && (
                        <div className="loot-filter-grid" aria-label={t("Loot container categories")}>
                          {lootGroupDefinitions.map((lootGroup) => {
                            const count = lootCounts.get(lootGroup.id) ?? 0;
                            if (!count) return null;
                            const enabled = visible.has("loot") && visibleLootGroups.has(lootGroup.id);
                            return (
                              <button
                                className={
                                  enabled ? `loot-filter ${lootGroup.id} enabled` : `loot-filter ${lootGroup.id}`
                                }
                                key={lootGroup.id}
                                aria-pressed={enabled}
                                onClick={() => onToggleLootGroup(lootGroup.id)}
                              >
                                <span className="loot-filter-symbol">
                                  <LootGroupGlyph group={lootGroup.id} />
                                </span>
                                <span>{t(lootGroup.name)}</span>
                                <b>{count}</b>
                                <i aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
          </div>

          {loading && <p className="drawer-message">{t("Loading bundled map intelligence…")}</p>}
          {error && <p className="drawer-message error">{localizeMessage(error)}</p>}
          {!loading && !error && bundle && bundle.pois.length === 0 && (
            <p className="drawer-message">{t("No intelligence is currently available for this map.")}</p>
          )}
          <footer className="intel-note">
            {t("Locations are possible static points. Raid availability is not guaranteed.")}
          </footer>
        </div>
      )}
    </aside>
  );
}
