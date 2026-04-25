import { lazy, Suspense } from "react";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
import type { RouteMode, RouteStop } from "../types";
import { useWander } from "../wander-state";

const RouteMapPreview = lazy(async () => {
  const module = await import("./RouteMapPreview");
  return {
    default: module.RouteMapPreview,
  };
});

export function SelectedRoutePanel() {
  const { parsed, routes, selectedRoute, openStop, location } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();
  const detailCopy = buildDetailCopy(language);

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

  const scheduleBlocks = buildScheduleBlocks(selectedRoute.stops);

  return (
    <div className="route-focus">
      <div className="focus-top clean-focus-top">
        <div>
          <span className="eyebrow">{copy.routeDetail.ready}</span>
          <h3>{selectedRoute.title}</h3>
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
              startLabel={parsed.startPoint}
              route={selectedRoute}
            />
          </Suspense>

          {selectedRoute.routeModes?.length ? (
            <div className="route-mode-grid">
              {selectedRoute.routeModes.map((mode) => (
                <article className="route-mode-card" key={mode.mode}>
                  <span className="mini-label">{detailCopy.modeSummary}</span>
                  <strong>{buildModeTitle(mode.mode, language)}</strong>
                  <p>{mode.label}</p>
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
                    <strong>{stop.name}</strong>
                    <span>{joinInline([stop.address, scheduleBlocks[index]])}</span>
                  </div>
                </div>
                {index < selectedRoute.stops.length - 1 ? <div className="map-link"></div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="timeline-card clean-route-card">
          <h3>{copy.routeDetail.timeline}</h3>
          <div className="timeline">
            {selectedRoute.stops.map((stop, index) => (
              <article className="timeline-stop" key={`${selectedRoute.id}-${stop.id}`}>
                <div className="stop-index">{index + 1}</div>
                <div className="timeline-stop-body">
                  <div className="timeline-stop-head">
                    <div>
                      <strong>{stop.name}</strong>
                      <small>
                        {joinInline([stop.address, getLocalizedCategoryLabel(stop.requestedCategory, language)])}
                      </small>
                    </div>
                    <div className="timeline-time-block">
                      <span className="mini-label">{detailCopy.scheduleBlock}</span>
                      <strong>{scheduleBlocks[index]}</strong>
                    </div>
                  </div>

                  <p className="ugc-brief">{stop.summary}</p>

                  {stop.travelModesFromPrevious?.length ? (
                    <div className="leg-modes">
                      {stop.travelModesFromPrevious.map((mode) => (
                        <article className="leg-mode-chip" key={`${stop.id}-${mode.mode}`}>
                          <div>
                            <span className="mini-label">{buildModeTitle(mode.mode, language)}</span>
                            <strong>{mode.label}</strong>
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
                    {stop.tags.map((tag) => (
                      <span className="stop-tag" key={`${stop.id}-${tag}`}>
                        {tag}
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
                    <span className="stop-tag">{stop.hours}</span>
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
        scheduleBlock: "时间",
      }
    : {
        openFirstLeg: "Open Nav",
        modeSummary: "Mode",
        scheduleBlock: "Time",
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

function buildScheduleBlocks(stops: RouteStop[]) {
  let cursor = 0;

  return stops.map((stop) => {
    const travelMinutes = stop.travelMinutesFromPrevious ?? 0;
    const arrival = cursor + travelMinutes;
    const departure = arrival + stop.duration;
    cursor = departure;
    return `${formatClock(arrival)} - ${formatClock(departure)}`;
  });
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
