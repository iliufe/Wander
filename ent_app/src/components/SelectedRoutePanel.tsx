import { lazy, Suspense } from "react";
import { getLocalizedCategoryLabel, useCopy, useLanguage } from "../i18n";
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
    activeTemplateId,
    generationLabel,
    liveDataState,
    location,
  } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();

  if (!selectedRoute) {
    const hasRoutes = routes.length > 0;

    return (
      <div className="route-empty-state">
        <span className="eyebrow">
          {hasRoutes ? copy.routes.selectedRoute : copy.routeDetail.waiting}
        </span>
        <h3>{hasRoutes ? copy.routeDetail.chooseRouteTitle : copy.routeDetail.waitingTitle}</h3>
        <p>
          {hasRoutes
            ? copy.routeDetail.chooseRouteNote
            : buildEmptyStateCopy(liveDataState.status, liveDataState.note, copy)}
        </p>
      </div>
    );
  }

  return (
    <div className="route-focus">
      <div className="focus-top">
        <div>
          <span className="eyebrow">{copy.routeDetail.ready}</span>
          <h3>{selectedRoute.title}</h3>
          <p>{selectedRoute.subtitle}</p>
        </div>
        <div className="meta-row">
          <span className="meta-pill">
            {copy.routeDetail.match} {selectedRoute.hitCount}/{parsed.categories.length}
          </span>
          <span className="meta-pill">
            {copy.routeDetail.score} {selectedRoute.fitScore}%
          </span>
          <span className="meta-pill live-pill">{generationLabel}</span>
        </div>
      </div>
      <div className="route-flags">
        {selectedRoute.adjustments.length ? (
          selectedRoute.adjustments.map((item) => (
            <span className="route-flag warning" key={item}>
              {item}
            </span>
          ))
        ) : (
          <span className="status-chip">{copy.routeDetail.direct}</span>
        )}
        <span className="route-flag">
          {activeTemplateId ? copy.routeDetail.shared : copy.routeDetail.realtime}
        </span>
        <span className="route-flag">
          {liveDataState.source === "open"
            ? `${copy.routeDetail.sourcePrefix}${liveDataState.note}`
            : copy.routeDetail.localSource}
        </span>
      </div>
      <div className="focus-grid">
        <section className="map-card">
          <h3>{copy.routeDetail.mapFlow}</h3>
          <p>{selectedRoute.clusterAccent}</p>
          <Suspense
            fallback={
              <div className="route-map-preview">
                <div className="route-empty-state">
                  <span className="eyebrow">Map</span>
                  <h3>{copy.routeDetail.mapLoading}</h3>
                  <p>{copy.routeDetail.mapLoadingNote}</p>
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
          <div className="mini-map">
            {selectedRoute.stops.map((stop, index) => (
              <div key={`${selectedRoute.id}-${stop.id}`}>
                <div className="map-node">
                  <div className="map-node-dot"></div>
                  <div>
                    <strong>{stop.name}</strong>
                    <span>
                      {stop.address} · {stop.visitLabel}
                    </span>
                  </div>
                </div>
                {index < selectedRoute.stops.length - 1 ? <div className="map-link"></div> : null}
              </div>
            ))}
          </div>
        </section>
        <section className="timeline-card">
          <h3>{copy.routeDetail.timeline}</h3>
          <p>{copy.routeDetail.timelineNote}</p>
          <div className="timeline">
            {selectedRoute.stops.map((stop, index) => (
              <article className="timeline-stop" key={`${selectedRoute.id}-${stop.id}`}>
                <div className="stop-index">{index + 1}</div>
                <div>
                  <strong>{stop.name}</strong>
                  <small>
                    {stop.address} · {getLocalizedCategoryLabel(stop.requestedCategory, language)}
                  </small>
                  <p className="ugc-brief">{stop.summary}</p>
                  <div className="route-flags">
                    <span className="route-flag">
                      {stop.travelFromPrevious ? stop.travelFromPrevious : copy.routeDetail.fromStart}
                    </span>
                    {stop.sourceType === "open-live" ? (
                      <span className="route-flag">{copy.routeDetail.livePoi}</span>
                    ) : (
                      <span className="route-flag">{copy.routeDetail.localPoi}</span>
                    )}
                  </div>
                  <div className="stop-tags">
                    {stop.tags.map((tag) => (
                      <span className="stop-tag" key={`${stop.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                    <span className="stop-tag">{stop.hours}</span>
                  </div>
                </div>
                <button
                  className="stop-pill"
                  type="button"
                  onClick={() => openStop(selectedRoute.id, stop.id)}
                >
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

function buildEmptyStateCopy(
  status: string,
  note: string,
  copy: ReturnType<typeof useCopy>
) {
  if (status === "loading") {
    return copy.routeDetail.emptyLoading;
  }

  if (status === "empty") {
    return `${note}${copy.routeDetail.emptyEmptySuffix}`;
  }

  if (status === "error") {
    return `${note}${copy.routeDetail.emptyErrorSuffix}`;
  }

  return note;
}
