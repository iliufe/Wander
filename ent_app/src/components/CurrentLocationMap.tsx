import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n";
import { localizeLocationLabel } from "../display-text";
import { loadAmapJsApi } from "../services/amap-web";
import type { DeviceLocation } from "../types";

interface CurrentLocationMapProps {
  location: DeviceLocation;
  onSelectPoint?: (latitude: number, longitude: number) => void;
}

export function CurrentLocationMap({ location, onSelectPoint }: CurrentLocationMapProps) {
  const { language } = useLanguage();
  const markerTitle = localizeLocationLabel(location, language);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ destroy: () => void } | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;
    const center =
      location.latitude != null && location.longitude != null
        ? [location.longitude, location.latitude]
        : [121.10562, 31.45229];

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
          zoom: location.latitude != null ? 16 : 13,
          center,
          lang: language === "en" ? "en" : "zh_cn",
          viewMode: "3D",
          mapStyle: "amap://styles/normal",
        });

        if (location.latitude != null && location.longitude != null) {
          if (location.accuracyMeters != null && location.accuracyMeters > 0) {
            const accuracyCircle = new AMap.Circle({
              center,
              radius: Math.min(location.accuracyMeters, 120),
              strokeColor: "#0f8f83",
              strokeOpacity: 0.35,
              strokeWeight: 1,
              fillColor: "#0f8f83",
              fillOpacity: 0.08,
            });
            map.add(accuracyCircle);
          }

          const marker = new AMap.Marker({
            position: center,
            title: markerTitle,
            offset: new AMap.Pixel(-11, -11),
            content: '<div class="wander-location-dot"><span></span></div>',
          });
          map.add(marker);
        }

        if (onSelectPoint) {
          (map as unknown as { on: (eventName: string, handler: (event: any) => void) => void }).on(
            "click",
            (event) => {
              const lngLat = event?.lnglat;
              const longitude =
                typeof lngLat?.getLng === "function" ? lngLat.getLng() : Number(lngLat?.lng);
              const latitude =
                typeof lngLat?.getLat === "function" ? lngLat.getLat() : Number(lngLat?.lat);

              if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                onSelectPoint(latitude, longitude);
              }
            }
          );
        }

        mapRef.current = map;
        setNote("");
      })
      .catch(() => {
        if (!cancelled) {
          setNote(language === "zh" ? "地图加载失败" : "Map unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, location.accuracyMeters, location.latitude, location.longitude, markerTitle, onSelectPoint]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="current-location-map-wrap">
      <div className="current-location-map" ref={containerRef} />
      {note ? <span className="current-location-map-note">{note}</span> : null}
    </div>
  );
}
