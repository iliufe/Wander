import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { fetchRouteFromOsrm } from "../services/openmap";
import type { Coordinates, RouteOption } from "../types";

const baseMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

interface RouteMapPreviewProps {
  startCoordinates: Coordinates | null;
  startLabel: string;
  route: RouteOption;
}

interface RouteMapState {
  status: "idle" | "loading" | "ready" | "error";
  note: string;
  distanceMeters: number;
  durationMinutes: number;
  geometry: [number, number][];
}

export function RouteMapPreview({ startCoordinates, startLabel, route }: RouteMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapState, setMapState] = useState<RouteMapState>({
    status: "idle",
    note: "等待生成开源地图路线。",
    distanceMeters: 0,
    durationMinutes: 0,
    geometry: [],
  });

  const fallbackGeometry = useMemo<[number, number][]>(
    () =>
      startCoordinates
        ? [
            [startCoordinates.longitude, startCoordinates.latitude],
            ...route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
          ]
        : route.stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]),
    [route.stops, startCoordinates]
  );

  useEffect(() => {
    if (!startCoordinates || !route.stops.length) {
      setMapState({
        status: "idle",
        note: "需要先拿到定位，才能在开源地图上渲染路线。",
        distanceMeters: 0,
        durationMinutes: 0,
        geometry: fallbackGeometry,
      });
      return;
    }

    let cancelled = false;
    setMapState((current) => ({
      ...current,
      status: "loading",
      note: "正在用 OSRM 计算真实步行路线。",
    }));

    fetchRouteFromOsrm(startCoordinates, route.stops, route.style === "efficient" ? "cycling" : "walking")
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setMapState({
          status: "ready",
          note: "路线线条和总时长来自 OSRM 开源路径规划。",
          distanceMeters: payload.distanceMeters,
          durationMinutes: payload.durationMinutes,
          geometry: payload.geometry.length ? payload.geometry : fallbackGeometry,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setMapState({
          status: "error",
          note: "OSRM 暂时不可用，当前先用站点连线示意。",
          distanceMeters: 0,
          durationMinutes: 0,
          geometry: fallbackGeometry,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackGeometry, route.stops, route.style, startCoordinates]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map =
      mapRef.current ||
      new maplibregl.Map({
        container: containerRef.current,
        style: baseMapStyle,
        center: fallbackGeometry[0] ?? [121.4737, 31.2304],
        zoom: 13,
      });

    mapRef.current = map;

    const syncMap = () => {
      const coordinates = mapState.geometry.length ? mapState.geometry : fallbackGeometry;
      if (!coordinates.length) {
        return;
      }

      const feature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: {},
      } as const;

      const source = map.getSource("wander-route") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(feature);
      } else {
        map.addSource("wander-route", {
          type: "geojson",
          data: feature,
        });
        map.addLayer({
          id: "wander-route-line",
          type: "line",
          source: "wander-route",
          paint: {
            "line-color": "#c9532f",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const points = [
        startCoordinates
          ? {
              label: "S",
              title: startLabel,
              longitude: startCoordinates.longitude,
              latitude: startCoordinates.latitude,
            }
          : null,
        ...route.stops.map((stop, index) => ({
          label: String(index + 1),
          title: stop.name,
          longitude: stop.longitude,
          latitude: stop.latitude,
        })),
      ].filter(Boolean) as Array<{
        label: string;
        title: string;
        longitude: number;
        latitude: number;
      }>;

      points.forEach((point) => {
        const element = document.createElement("div");
        element.className = "route-map-marker";
        element.innerHTML = `<span>${point.label}</span>`;
        element.title = point.title;

        const marker = new maplibregl.Marker({
          element,
          anchor: "center",
        })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });

      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((coordinate) => bounds.extend(coordinate));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 42,
          duration: 0,
          maxZoom: 15.2,
        });
      }
    };

    if (map.loaded()) {
      syncMap();
    } else {
      map.once("load", syncMap);
    }

    return () => {
      if (!containerRef.current && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fallbackGeometry, mapState.geometry, route.stops, startCoordinates, startLabel]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <section className="route-map-preview">
      <div className="route-map-header">
        <div>
          <span className="mini-label">Open Map Preview</span>
          <strong>{route.title}</strong>
        </div>
        <div className="route-map-meta">
          <span className="meta-pill">
            {mapState.distanceMeters ? `全程 ${formatDistance(mapState.distanceMeters)}` : "等待线路"}
          </span>
          <span className="meta-pill">
            {mapState.durationMinutes ? `${mapState.durationMinutes} 分钟` : "时长待计算"}
          </span>
        </div>
      </div>
      <div className="route-map-surface" ref={containerRef} />
      <p className={`route-map-note is-${mapState.status}`}>{mapState.note}</p>
    </section>
  );
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} 米`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} 公里`;
}
