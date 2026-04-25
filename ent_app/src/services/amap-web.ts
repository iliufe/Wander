type AMapConstructor<T = unknown> = new (...args: any[]) => T;

interface AMapMapLike {
  destroy: () => void;
  setFitView: (overlays?: unknown[]) => void;
  add: (overlay: unknown | unknown[]) => void;
}

interface AMapGlobalLike {
  Map: AMapConstructor<AMapMapLike>;
  Marker: AMapConstructor;
  Polyline: AMapConstructor;
  Circle: AMapConstructor;
  Pixel: AMapConstructor;
}

declare global {
  interface Window {
    AMap?: AMapGlobalLike;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const amapScriptId = "wander-amap-jsapi";

let amapLoadPromise: Promise<AMapGlobalLike> | null = null;

export function getAmapJsConfig() {
  return {
    key: import.meta.env.VITE_AMAP_JS_KEY || "",
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JSCODE || "",
  };
}

export async function loadAmapJsApi(): Promise<AMapGlobalLike> {
  const config = getAmapJsConfig();
  if (!config.key) {
    throw new Error("VITE_AMAP_JS_KEY is not configured");
  }

  if (typeof window === "undefined") {
    throw new Error("AMap JS API can only load in a browser environment");
  }

  if (window.AMap) {
    return window.AMap;
  }

  if (!amapLoadPromise) {
    amapLoadPromise = new Promise<AMapGlobalLike>((resolve, reject) => {
      if (config.securityJsCode) {
        window._AMapSecurityConfig = {
          securityJsCode: config.securityJsCode,
        };
      }

      const existing = document.getElementById(amapScriptId) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.AMap) {
            resolve(window.AMap);
            return;
          }

          reject(new Error("AMap JS API failed to initialize"));
        });
        existing.addEventListener("error", () => reject(new Error("AMap JS API script failed to load")));
        return;
      }

      const script = document.createElement("script");
      script.id = amapScriptId;
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}`;
      script.onload = () => {
        if (window.AMap) {
          resolve(window.AMap);
          return;
        }

        reject(new Error("AMap JS API loaded but window.AMap is missing"));
      };
      script.onerror = () => reject(new Error("AMap JS API script failed to load"));
      document.head.appendChild(script);
    }).catch((error) => {
      amapLoadPromise = null;
      throw error;
    });
  }

  return amapLoadPromise;
}
