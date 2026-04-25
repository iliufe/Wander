import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../i18n";
import { loadAmapJsApi } from "../services/amap-web";
import type { Coordinates, RouteOption } from "../types";

interface RouteMapPreviewProps {
  startCoordinates: Coordinates | null;
  startLabel: string;
  route: RouteOption;
}

export function RouteMapPreview({ startCoordinates, startLabel, route }: RouteMapPreviewProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ destroy: () => void } | null>(null);
  const [error, setError] = useState("");

  const effectiveGeometry = useMemo<[number, number][]>(
    () =>
      route.routeGeometry?.length
        ? route.routeGeometry
        : startCoordinates
          ? [
              [startCoordinates.longitude, startCoordinates.latitude],
              ...route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
            ]
          : route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
    [route.routeGeometry, route.stops, startCoordinates]
  );

  useEffect(() => {
    if (!containerRef.current || !startCoordinates || !effectiveGeometry.length) {
      return;
    }

    let cancelled = false;
    setError("");

    loadAmapJsApi()
      .then((AMap) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }

        const map = new AMap.Map(containerRef.current, {
          zoom: 13,
          center: [startCoordinates.longitude, startCoordinates.latitude],
          viewMode: "3D",
          mapStyle: "amap://styles/normal",
        });

        const overlays: unknown[] = [];
        overlays.push(
          new AMap.Marker({
            position: [startCoordinates.longitude, startCoordinates.latitude],
            title: startLabel,
            label: {
              direction: "top",
              content: '<div class="wander-amap-label">S</div>',
            },
          })
        );

        route.stops.forEach((stop, index) => {
          overlays.push(
            new AMap.Marker({
              position: [stop.longitude, stop.latitude],
              title: stop.name,
              label: {
                direction: "top",
                content: `<div class="wander-amap-label">${index + 1}</div>`,
              },
            })
          );
        });

        overlays.push(
          new AMap.Polyline({
            path: effectiveGeometry,
            strokeColor: "#c9532f",
            strokeWeight: 6,
            strokeOpacity: 0.95,
            lineJoin: "round",
            lineCap: "round",
          })
        );

        map.add(overlays);
        map.setFitView(overlays);
        mapRef.current = map;
      })
      .catch((errorValue) => {
        if (!cancelled) {
          setError(
            language === "zh"
              ? "地图加载失败"
              : `Map failed to load: ${errorValue instanceof Error ? errorValue.message : "unknown error"}`
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveGeometry, language, route.stops, startCoordinates, startLabel]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <section className="route-map-preview clean-map-preview">
      <div className="route-map-surface" ref={containerRef} />
      {error ? <p className="route-map-note is-error">{error}</p> : null}
    </section>
  );
}
