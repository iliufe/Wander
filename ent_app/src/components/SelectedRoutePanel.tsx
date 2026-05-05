import { lazy, Suspense, useEffect, useState } from "react";
import {
  localizePlainText,
  localizeRouteTitle,
  localizeSearchPlace,
  localizeStopAddress,
  localizeStopName,
} from "../display-text";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import { searchStartPlacesWithApi, type StartPlaceSearchResult } from "../services/plans-api";
import type { RouteMode } from "../types";
import { useWander } from "../wander-state";

const RouteMapPreview = lazy(async () => {
  const module = await import("./RouteMapPreview");
  return {
    default: module.RouteMapPreview,
  };
});

export function SelectedRoutePanel() {
  const {
    parsed,
    routes,
    selectedRoute,
    openStop,
    location,
    moveRouteStop,
    moveRouteStopToIndex,
    removeRouteStop,
    addRouteStopFromPlace,
  } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();
  const detailCopy = buildDetailCopy(language);
  const editCopy = buildRouteEditCopyV2(language);
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<StartPlaceSearchResult[]>([]);
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "empty">("idle");

  useEffect(() => {
    const query = addQuery.trim();
    if (!selectedRoute || query.length < 2) {
      setAddResults([]);
      setAddStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setAddStatus("loading");
    const timer = window.setTimeout(() => {
      searchStartPlacesWithApi(
        {
          query,
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.cityName || location.districtName,
          adcode: location.adcode,
        },
        controller.signal
      )
        .then((places) => {
          if (controller.signal.aborted) {
            return;
          }
          setAddResults(places);
          setAddStatus(places.length ? "idle" : "empty");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setAddResults([]);
            setAddStatus("empty");
          }
        });
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    addQuery,
    location.adcode,
    location.cityName,
    location.districtName,
    location.latitude,
    location.longitude,
    selectedRoute,
  ]);

  if (!selectedRoute) {
    const hasRoutes = routes.length > 0;

    return (
      <div className="route-empty-state">
        <span className="eyebrow">
          {hasRoutes ? copy.routes.selectedRoute : copy.routeDetail.waiting}
        </span>
        <h3>{hasRoutes ? copy.routeDetail.chooseRouteTitle : copy.routeDetail.waitingTitle}</h3>
      </div>
    );
  }

  const startLabel = language === "zh" ? parsed.startPoint : "Start";

  return (
    <div className="route-focus">
      <div className="focus-top clean-focus-top">
        <div>
          <span className="eyebrow">{copy.routeDetail.ready}</span>
          <h3>{localizeRouteTitle(selectedRoute, language)}</h3>
        </div>
        {selectedRoute.navigationUrl ? (
          <a className="route-nav-link" href={selectedRoute.navigationUrl} target="_blank" rel="noreferrer">
            {detailCopy.openFirstLeg}
          </a>
        ) : null}
      </div>

      <div className="focus-grid clean-focus-grid">
        <section className="map-card clean-route-card">
          <div className="route-section-head">
            <h3>{copy.routeDetail.mapFlow}</h3>
          </div>

          <Suspense
            fallback={
              <div className="route-map-preview">
                <div className="route-empty-state">
                  <span className="eyebrow">Map</span>
                  <h3>{copy.routeDetail.mapLoading}</h3>
                </div>
              </div>
            }
          >
            <RouteMapPreview
              startCoordinates={
                location.latitude != null && location.longitude != null
                  ? {
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }
                  : null
              }
              startLabel={startLabel}
              route={selectedRoute}
            />
          </Suspense>

          {selectedRoute.routeModes?.length ? (
            <div className="route-mode-grid">
              {selectedRoute.routeModes.map((mode) => (
                <article className="route-mode-card" key={mode.mode}>
                  <span className="mini-label">{detailCopy.modeSummary}</span>
                  <strong>{buildModeTitle(mode.mode, language)}</strong>
                  <p>{localizePlainText(mode.label, language, "Estimated travel option")}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="mini-map">
            {selectedRoute.stops.map((stop, index) => (
              <div key={`${selectedRoute.id}-${stop.id}`}>
                <div className="map-node">
                  <div className="map-node-dot"></div>
                  <div>
                    <strong>{localizeStopName(stop, language, index)}</strong>
                    <span>{localizeStopAddress(stop, language)}</span>
                  </div>
                </div>
                {index < selectedRoute.stops.length - 1 ? <div className="map-link"></div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="timeline-card clean-route-card">
          <h3>{copy.routeDetail.timeline}</h3>
          <div className="route-add-stop-card">
            <strong>{editCopy.addStop}</strong>
            <div className="ride-search-box">
              <span className="ride-search-icon"></span>
              <input
                value={addQuery}
                onChange={(event) => setAddQuery(event.target.value)}
                placeholder={editCopy.addPlaceholder}
              />
            </div>
            {addStatus === "loading" ? <div className="start-search-state">{editCopy.searching}</div> : null}
            {addStatus === "empty" && addQuery.trim().length >= 2 ? (
              <div className="start-search-state">{editCopy.noResults}</div>
            ) : null}
            {addResults.length ? (
              <div className="start-result-list route-add-results">
                {addResults.map((place, placeIndex) => {
                  const displayPlace = localizeSearchPlace(place, language, placeIndex);
                  return (
                  <button
                    className="start-result-item"
                    key={place.id}
                    type="button"
                    onClick={() => {
                      addRouteStopFromPlace(selectedRoute.id, place);
                      setAddQuery("");
                      setAddResults([]);
                      setAddStatus("idle");
                    }}
                  >
                    <span className="start-result-pin">{placeIndex + 1}</span>
                    <span className="start-result-copy">
                      <strong>{displayPlace.name}</strong>
                      <small>{displayPlace.address}</small>
                    </span>
                  </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="timeline">
            {selectedRoute.stops.map((stop, index) => (
              <article
                className={`timeline-stop ${draggedStopId === stop.id ? "is-dragging" : ""}`}
                draggable
                key={`${selectedRoute.id}-${stop.id}`}
                onDragStart={(event) => {
                  setDraggedStopId(stop.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", stop.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceStopId = draggedStopId || event.dataTransfer.getData("text/plain");
                  if (sourceStopId) {
                    moveRouteStopToIndex(selectedRoute.id, sourceStopId, index);
                  }
                  setDraggedStopId(null);
                }}
                onDragEnd={() => setDraggedStopId(null)}
              >
                <div className="stop-index">{index + 1}</div>
                <div className="timeline-stop-body">
                  <div className="timeline-stop-head">
                    <div>
                      <strong>{localizeStopName(stop, language, index)}</strong>
                      <small>
                        {joinDisplayInline([localizeStopAddress(stop, language), getLocalizedCategoryLabel(stop.requestedCategory, language)])}
                      </small>
                    </div>
                  </div>

                  <div className="route-edit-actions" aria-label={editCopy.editRoute}>
                    <button
                      type="button"
                      onClick={() => moveRouteStop(selectedRoute.id, stop.id, "up")}
                      disabled={index === 0}
                    >
                      {editCopy.moveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRouteStop(selectedRoute.id, stop.id, "down")}
                      disabled={index === selectedRoute.stops.length - 1}
                    >
                      {editCopy.moveDown}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRouteStop(selectedRoute.id, stop.id)}
                      disabled={selectedRoute.stops.length <= 1}
                    >
                      {editCopy.remove}
                    </button>
                  </div>

                  <p className="ugc-brief">{localizePlainText(stop.summary, language, "Stop details are available.")}</p>

                  {stop.travelModesFromPrevious?.length ? (
                    <div className="leg-modes">
                      {stop.travelModesFromPrevious.map((mode) => (
                        <article className="leg-mode-chip" key={`${stop.id}-${mode.mode}`}>
                          <div>
                            <span className="mini-label">{buildModeTitle(mode.mode, language)}</span>
                            <strong>{localizePlainText(mode.label, language, "Estimated travel time")}</strong>
                          </div>
                          {mode.navigationUrl ? (
                            <a href={mode.navigationUrl} target="_blank" rel="noreferrer">
                              {buildNavigateLabel(mode.mode, language)}
                            </a>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}

                  <div className="stop-tags">
                    {stop.tags.map((tag, tagIndex) => (
                      <span className="stop-tag" key={`${stop.id}-${tag}`}>
                        {localizePlainText(tag, language, `Tag ${tagIndex + 1}`)}
                      </span>
                    ))}
                    <span className="stop-tag">
                      {copy.stopSheet.rating} {stop.rating}
                    </span>
                    {stop.averageCostCny != null ? (
                      <span className="stop-tag">
                        {language === "zh" ? `人均 ¥${stop.averageCostCny}` : `Avg ¥${stop.averageCostCny}`}
                      </span>
                    ) : null}
                    {stop.groupbuyCount != null ? (
                      <span className="stop-tag">
                        {language === "zh" ? `团购 ${stop.groupbuyCount}` : `Group-buy ${stop.groupbuyCount}`}
                      </span>
                    ) : null}
                    <span className="stop-tag">{localizePlainText(stop.hours, language, "Hours available")}</span>
                  </div>
                </div>

                <button className="stop-pill" type="button" onClick={() => openStop(selectedRoute.id, stop.id)}>
                  {copy.routeDetail.viewStop}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildDetailCopy(language: "zh" | "en") {
  return language === "zh"
    ? {
        openFirstLeg: "打开导航",
        modeSummary: "方式",
      }
    : {
        openFirstLeg: "Open Nav",
        modeSummary: "Mode",
      };
}

/*
function _buildRouteEditCopyLegacy(language: "zh" | "en") {
  return language === "zh"
    ? {
        editRoute: "编辑路线",
        moveUp: "上移",
        moveDown: "下移",
        remove: "删除",
      }
    : {
        editRoute: "Edit route",
        moveUp: "Move up",
        moveDown: "Move down",
        remove: "Remove",
      };
}
*/

function buildRouteEditCopyV2(language: "zh" | "en") {
  return language === "zh"
    ? {
        editRoute: "编辑路线",
        moveUp: "上移",
        moveDown: "下移",
        remove: "删除",
        addStop: "添加地点",
        addPlaceholder: "输入地点关键词，例如 加油站",
        searching: "正在搜索地点...",
        noResults: "没有找到匹配地点，请换个关键词。",
      }
    : {
        editRoute: "Edit route",
        moveUp: "Move up",
        moveDown: "Move down",
        remove: "Remove",
        addStop: "Add stop",
        addPlaceholder: "Search a place, e.g. gas station",
        searching: "Searching places...",
        noResults: "No matching place yet. Try another keyword.",
      };
}

function buildModeTitle(mode: RouteMode, language: "zh" | "en") {
  if (language === "zh") {
    if (mode === "riding") return "骑行";
    if (mode === "driving") return "打车";
    return "步行";
  }

  if (mode === "riding") return "Ride";
  if (mode === "driving") return "Taxi";
  return "Walk";
}

function buildNavigateLabel(mode: RouteMode, language: "zh" | "en") {
  if (language === "zh") {
    if (mode === "riding") return "骑行导航";
    if (mode === "driving") return "打车导航";
    return "步行导航";
  }

  if (mode === "riding") return "Ride Nav";
  if (mode === "driving") return "Taxi Nav";
  return "Walk Nav";
}

function joinInline(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" · ");
}

function joinDisplayInline(values: Array<string | null | undefined>) {
  void joinInline([]);
  return values.filter(Boolean).join(" · ");
}
