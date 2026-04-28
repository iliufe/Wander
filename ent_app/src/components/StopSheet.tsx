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
          avgSpend: "\u4eba\u5747\u6d88\u8d39",
          groupbuy: "\u56e2\u8d2d",
          merchantIntro: "\u5546\u5bb6\u4ecb\u7ecd",
          merchantHighlights: "\u63a8\u8350\u7406\u7531",
          phone: "\u7535\u8bdd",
          address: "\u5730\u5740",
          unavailable: "\u6682\u65e0",
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
    stop.averageCostCny != null
      ? language === "zh"
        ? `\u7ea6 \u00a5${stop.averageCostCny}/\u4eba`
        : `About \u00a5${stop.averageCostCny}/person`
      : detailCopy.unavailable;
  const groupbuyLabel =
    stop.groupbuyCount != null
      ? language === "zh"
        ? `${stop.groupbuyCount} \u4e2a\u4f18\u60e0`
        : `${stop.groupbuyCount} offers`
      : detailCopy.unavailable;

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
                  localizePlainText(stop.hours, language, language === "zh" ? "\u8425\u4e1a\u65f6\u95f4\u5f85\u786e\u8ba4" : "Hours available"),
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
              <strong>
                {localizePlainText(stop.ugc.stay, language, language === "zh" ? "\u5efa\u8bae\u505c\u7559" : "Suggested stay")}
              </strong>
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
              <strong>{localizePlainText(stop.crowd, language, language === "zh" ? "\u9002\u5408\u65f6\u95f4\u5f85\u786e\u8ba4" : "Best time available")}</strong>
            </article>
          </div>

          <section className="ugc-quote">
            <strong>{detailCopy.merchantIntro}</strong>
            <p>{localizePlainText(stop.merchantIntro || stop.summary, language, language === "zh" ? "\u5546\u5bb6\u4fe1\u606f\u5f85\u786e\u8ba4" : "Merchant details are available.")}</p>
          </section>

          {stop.merchantHighlights?.length ? (
            <section className="sheet-highlights">
              <span>{detailCopy.merchantHighlights}</span>
              <ul className="sheet-highlight-list">
                {stop.merchantHighlights.map((item, index) => (
                  <li key={`${stop.id}-${item}`}>
                    {localizePlainText(item, language, language === "zh" ? `\u63a8\u8350\u7406\u7531 ${index + 1}` : `Highlight ${index + 1}`)}
                  </li>
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
            <p>{localizePlainText(stop.ugc.tip, language, language === "zh" ? "\u5bfc\u822a\u4fe1\u606f\u5f85\u786e\u8ba4" : "Navigation details are available.")}</p>
          </section>
        </div>
      </aside>
    </>
  );
}

function joinInline(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" · ");
}
