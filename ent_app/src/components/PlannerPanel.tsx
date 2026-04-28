import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cityDriftData } from "../data";
import type { DeviceLocation } from "../types";
import { useCopy, useLanguage } from "../i18n";
import { searchStartPlacesWithApi, type StartPlaceSearchResult } from "../services/plans-api";
import { useWander } from "../wander-state";
import { CurrentLocationMap } from "./CurrentLocationMap";
import { TimeWheelPicker } from "./TimeWheelPicker";

export function PlannerPanel() {
  const {
    inputPrompt,
    setInputPrompt,
    location,
    locationReady,
    requestCurrentLocation,
    selectStartCoordinates,
    selectStartPlace,
    timeSelection,
    setTimeSelection,
    canGenerate,
    commitPrompt,
    applyQuickPrompt,
    liveDataState,
    routes,
  } = useWander();
  const { language } = useLanguage();
  const copy = useCopy();
  const navigate = useNavigate();
  const labels = buildPlannerLabels(language);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState("");
  const [startQuery, setStartQuery] = useState("");
  const [startResults, setStartResults] = useState<StartPlaceSearchResult[]>([]);
  const [startSearchStatus, setStartSearchStatus] = useState<"idle" | "loading" | "empty">("idle");
  const [startStatusText, setStartStatusText] = useState("");
  const showGenerating = isGenerating || liveDataState.status === "loading";

  useEffect(() => {
    if (liveDataState.status === "loading") {
      setIsGenerating(true);
      setProgress((current) => Math.max(current, 8));
      setGenerationError("");
    }
  }, [liveDataState.status]);

  useEffect(() => {
    if (!showGenerating || liveDataState.status !== "loading") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(99, current + 1));
    }, 180);

    return () => window.clearInterval(timer);
  }, [showGenerating, liveDataState.status]);

  useEffect(() => {
    if (!showGenerating || !routes.length) {
      return undefined;
    }

    setProgress(100);
    const timer = window.setTimeout(() => {
      setIsGenerating(false);
      navigate("/routes");
    }, 520);

    return () => window.clearTimeout(timer);
  }, [showGenerating, navigate, routes.length]);

  useEffect(() => {
    if (!showGenerating || liveDataState.status !== "error") {
      return;
    }

    setGenerationError(labels.generationFailed);
    setIsGenerating(false);
  }, [showGenerating, labels.generationFailed, liveDataState.status]);

  useEffect(() => {
    const query = startQuery.trim();
    if (query.length < 2) {
      setStartResults([]);
      setStartSearchStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setStartSearchStatus("loading");

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

          setStartResults(places);
          setStartSearchStatus(places.length ? "idle" : "empty");
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setStartResults([]);
          setStartSearchStatus("empty");
        });
    }, 360);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    location.adcode,
    location.cityName,
    location.districtName,
    location.latitude,
    location.longitude,
    startQuery,
  ]);

  const handleMapPointSelect = useCallback(
    (latitude: number, longitude: number) => {
      setStartStatusText(labels.confirmingPoint);
      void selectStartCoordinates(latitude, longitude).finally(() => {
        setStartStatusText(labels.startUpdated);
      });
    },
    [labels.confirmingPoint, labels.startUpdated, selectStartCoordinates]
  );

  const handleGenerate = () => {
    if (!canGenerate || showGenerating) {
      return;
    }

    setGenerationError("");
    setProgress(8);
    setIsGenerating(true);
    commitPrompt();
  };

  return (
    <section className="planner-home-panel planner-compact">
      <section className="planner-map-panel">
        <CurrentLocationMap location={location} onSelectPoint={handleMapPointSelect} />
        <div className="map-action-row">
          <button
            className={`location-button map-location-button ${locationReady ? "is-ready" : ""}`}
            type="button"
            onClick={requestCurrentLocation}
            disabled={location.permission === "requesting" || location.permission === "unsupported"}
          >
            {getLocationButtonLabel(location, language)}
          </button>
          <span>{startStatusText || labels.mapPickHint}</span>
        </div>

        <div className="start-picker-panel">
          <div className="start-picker-head">
            <strong>{labels.startTitle}</strong>
            <span>{location.nearbyPlaceName || location.label}</span>
          </div>
          <div className="ride-search-box">
            <span className="ride-search-icon"></span>
            <input
              value={startQuery}
              placeholder={labels.searchPlaceholder}
              onChange={(event) => setStartQuery(event.target.value)}
            />
            {startQuery ? (
              <button
                aria-label={labels.clearSearch}
                className="ride-search-clear"
                type="button"
                onClick={() => {
                  setStartQuery("");
                  setStartResults([]);
                  setStartSearchStatus("idle");
                }}
              >
                x
              </button>
            ) : null}
          </div>

          {startSearchStatus === "loading" ? (
            <div className="start-search-state">{labels.searching}</div>
          ) : null}
          {startSearchStatus === "empty" && startQuery.trim().length >= 2 ? (
            <div className="start-search-state">{labels.noResults}</div>
          ) : null}
          {startResults.length ? (
            <div className="start-result-list">
              {startResults.map((place, index) => (
                <button
                  className="start-result-item"
                  key={place.id}
                  type="button"
                  onClick={() => {
                    selectStartPlace(place);
                    setStartResults([]);
                    setStartQuery(place.name);
                    setStartSearchStatus("idle");
                    setStartStatusText(labels.startUpdated);
                  }}
                >
                  <span className="start-result-pin">{index + 1}</span>
                  <span className="start-result-copy">
                    <strong>{place.name}</strong>
                    <small>{place.address || place.area}</small>
                  </span>
                  <span className="start-result-distance">{formatDistance(place.distanceMeters, language)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="planner-form-panel">
        <label className="input-label" htmlFor="request-input">
          {copy.planner.requestLabel}
        </label>
        <textarea
          id="request-input"
          rows={4}
          value={inputPrompt}
          onChange={(event) => setInputPrompt(event.target.value)}
          placeholder={copy.planner.requestPlaceholder}
        />

        <div className="prompt-row compact">
          <div className="chip-wrap">
            {cityDriftData.quickPrompts.slice(0, 3).map((prompt) => (
              <button className="chip" key={prompt} type="button" onClick={() => applyQuickPrompt(prompt)}>
                {prompt.length > 18 ? `${prompt.slice(0, 18)}...` : prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="planner-controls-panel">
        <TimeWheelPicker value={timeSelection} onChange={setTimeSelection} />

        {showGenerating ? (
          <div className="planner-loading-card" aria-live="polite">
            <div className="planner-loading-top">
              <span>{labels.generating}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="planner-progress-track">
              <div className="planner-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : null}

        {generationError ? <p className="auth-error">{generationError}</p> : null}

        <button
          className="primary-button planner-submit"
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || showGenerating}
        >
          {showGenerating ? labels.generatingShort : locationReady ? copy.planner.generate : copy.planner.needLocation}
        </button>
      </section>
    </section>
  );
}

function buildPlannerLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        startTitle: "出发点",
        searchPlaceholder: "输入关键词选择出发地址",
        searching: "正在搜索地址...",
        noResults: "暂时没有找到匹配地址，请换个关键词。",
        startUpdated: "已设为出发点",
        confirmingPoint: "正在确认地图选点",
        mapPickHint: "点击地图可精修出发点",
        clearSearch: "清空搜索",
        generating: "正在生成路线",
        generatingShort: "生成中",
        generationFailed: "生成失败，请稍后再试。",
      }
    : {
        startTitle: "Start",
        searchPlaceholder: "Enter keywords to choose a start address",
        searching: "Searching addresses...",
        noResults: "No matching address yet. Try another keyword.",
        startUpdated: "Start updated",
        confirmingPoint: "Confirming map point",
        mapPickHint: "Tap the map to refine the start",
        clearSearch: "Clear search",
        generating: "Generating routes",
        generatingShort: "Generating",
        generationFailed: "Generation failed. Please try again.",
      };
}

function getLocationButtonLabel(location: DeviceLocation, language: "zh" | "en") {
  if (location.permission === "requesting") {
    return language === "zh" ? "定位中" : "Locating";
  }

  if (location.permission === "granted") {
    return language === "zh" ? "重新定位" : "Refresh";
  }

  if (location.permission === "denied" || location.permission === "error") {
    return language === "zh" ? "重新定位" : "Try Again";
  }

  if (location.permission === "unsupported") {
    return language === "zh" ? "不可用" : "Unavailable";
  }

  return language === "zh" ? "开启 GPS" : "Allow GPS";
}

function formatDistance(distanceMeters: number, language: "zh" | "en") {
  if (!Number.isFinite(distanceMeters)) {
    return "";
  }

  if (distanceMeters < 1000) {
    return language === "zh" ? `${Math.round(distanceMeters)}米` : `${Math.round(distanceMeters)}m`;
  }

  return language === "zh"
    ? `${(distanceMeters / 1000).toFixed(1)}公里`
    : `${(distanceMeters / 1000).toFixed(1)}km`;
}
