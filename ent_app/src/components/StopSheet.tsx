import type { CategoryId, RouteStop } from "../types";
import { useCopy, useLanguage } from "../i18n";

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
          avgSpend: "人均消费",
          groupbuy: "团购",
          merchantIntro: "商家介绍",
          merchantHighlights: "推荐理由",
          phone: "电话",
          address: "地址",
          unavailable: "暂无",
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
        ? `约 ¥${stop.averageCostCny}/人`
        : `About ¥${stop.averageCostCny}/person`
      : detailCopy.unavailable;
  const groupbuyLabel =
    stop.groupbuyCount != null
      ? language === "zh"
        ? `${stop.groupbuyCount} 个优惠`
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
              <h3>{stop.name}</h3>
              <p className="ugc-brief">
                {joinInline([stop.address, stop.hours, `${copy.stopSheet.rating} ${stop.rating}`])}
              </p>
            </div>
            <button className="sheet-close" type="button" onClick={onClose}>
              {copy.stopSheet.close}
            </button>
          </div>

          <div className="sheet-grid">
            <article>
              <span>{copy.stopSheet.stay}</span>
              <strong>{stop.ugc.stay}</strong>
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
              <strong>{stop.crowd}</strong>
            </article>
          </div>

          <section className="ugc-quote">
            <strong>{detailCopy.merchantIntro}</strong>
            <p>{stop.merchantIntro || stop.summary}</p>
          </section>

          {stop.merchantHighlights?.length ? (
            <section className="sheet-highlights">
              <span>{detailCopy.merchantHighlights}</span>
              <ul className="sheet-highlight-list">
                {stop.merchantHighlights.map((item) => (
                  <li key={`${stop.id}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="sheet-contact-grid">
            <article>
              <span>{detailCopy.address}</span>
              <strong>{stop.address}</strong>
            </article>
            <article>
              <span>{detailCopy.phone}</span>
              <strong>{stop.phone || detailCopy.unavailable}</strong>
            </article>
          </section>

          <section className="sheet-tip">
            <span>{copy.stopSheet.tip}</span>
            <p>{stop.ugc.tip}</p>
          </section>
        </div>
      </aside>
    </>
  );
}

function joinInline(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" · ");
}
