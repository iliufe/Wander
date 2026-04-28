import {
  localizePlainText,
  localizeStopAddress,
  localizeStopName,
} from "../display-text";
import { useCopy, useLanguage } from "../i18n";
import type { CategoryId, RouteStop } from "../types";

interface StopSheetProps {
  stop: RouteStop | null;
  getCategoryLabel: (category: CategoryId) => string;
  onClose: () => void;
}

export function StopSheet({ stop, onClose }: StopSheetProps) {
  const copy = useCopy();
  const { language } = useLanguage();

  if (!stop) {
    return null;
  }

  const detailCopy =
    language === "zh"
      ? {
          avgSpend: "Avg Spend",
          groupbuy: "Group-buy",
          merchantIntro: "Merchant Intro",
          merchantHighlights: "Highlights",
          phone: "Phone",
          address: "Address",
          unavailable: "Unavailable",
        }
      : {
          avgSpend: "Avg Spend",
          groupbuy: "Group-buy",
          merchantIntro: "Merchant Intro",
          merchantHighlights: "Highlights",
          phone: "Phone",
          address: "Address",
          unavailable: "Unavailable",
        };

  const costLabel =
    stop.averageCostCny != null ? `About ¥${stop.averageCostCny}/person` : detailCopy.unavailable;
  const groupbuyLabel =
    stop.groupbuyCount != null ? `${stop.groupbuyCount} offers` : detailCopy.unavailable;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet" aria-live="polite">
        <div className="sheet-card">
          <div className="sheet-head">
            <div>
              <span className="eyebrow">{detailCopy.merchantIntro}</span>
              <h3>{localizeStopName(stop, language)}</h3>
              <p className="ugc-brief">
                {joinInline([
                  localizeStopAddress(stop, language),
                  localizePlainText(stop.hours, language, "Hours available"),
                  `${copy.stopSheet.rating} ${stop.rating}`,
                ])}
              </p>
            </div>
            <button className="sheet-close" type="button" onClick={onClose}>
              {copy.stopSheet.close}
            </button>
          </div>

          <div className="sheet-grid">
            <article>
              <span>{copy.stopSheet.stay}</span>
              <strong>{localizePlainText(stop.ugc.stay, language, "Suggested stay")}</strong>
            </article>
            <article>
              <span>{detailCopy.avgSpend}</span>
              <strong>{costLabel}</strong>
            </article>
            <article>
              <span>{detailCopy.groupbuy}</span>
              <strong>{groupbuyLabel}</strong>
            </article>
            <article>
              <span>{copy.stopSheet.bestTime}</span>
              <strong>{localizePlainText(stop.crowd, language, "Best time available")}</strong>
            </article>
          </div>

          <section className="ugc-quote">
            <strong>{detailCopy.merchantIntro}</strong>
            <p>{localizePlainText(stop.merchantIntro || stop.summary, language, "Merchant details are available.")}</p>
          </section>

          {stop.merchantHighlights?.length ? (
            <section className="sheet-highlights">
              <span>{detailCopy.merchantHighlights}</span>
              <ul className="sheet-highlight-list">
                {stop.merchantHighlights.map((item, index) => (
                  <li key={`${stop.id}-${item}`}>{localizePlainText(item, language, `Highlight ${index + 1}`)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="sheet-contact-grid">
            <article>
              <span>{detailCopy.address}</span>
              <strong>{localizeStopAddress(stop, language)}</strong>
            </article>
            <article>
              <span>{detailCopy.phone}</span>
              <strong>{stop.phone || detailCopy.unavailable}</strong>
            </article>
          </section>

          <section className="sheet-tip">
            <span>{copy.stopSheet.tip}</span>
            <p>{localizePlainText(stop.ugc.tip, language, "Navigation details are available.")}</p>
          </section>
        </div>
      </aside>
    </>
  );
}

function joinInline(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" · ");
}
