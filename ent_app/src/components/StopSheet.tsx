import type { CategoryId, RouteStop } from "../types";
import { useCopy } from "../i18n";

interface StopSheetProps {
  stop: RouteStop | null;
  getCategoryLabel: (category: CategoryId) => string;
  onClose: () => void;
}

export function StopSheet({ stop, getCategoryLabel, onClose }: StopSheetProps) {
  const copy = useCopy();

  if (!stop) {
    return null;
  }

  const isLivePoi = stop.sourceType === "open-live";

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet" aria-live="polite">
        <div className="sheet-card">
          <div className="sheet-head">
            <div>
              <span className="eyebrow">{isLivePoi ? copy.stopSheet.liveDigest : copy.stopSheet.verified}</span>
              <h3>{stop.name}</h3>
              <p className="ugc-brief">
                {stop.address} · {stop.hours} · {copy.stopSheet.rating} {stop.rating}
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
              <span>{isLivePoi ? copy.stopSheet.source : copy.stopSheet.visitVerified}</span>
              <strong>{stop.ugc.verified}</strong>
            </article>
            <article>
              <span>{copy.stopSheet.bestTime}</span>
              <strong>{stop.crowd}</strong>
            </article>
            <article>
              <span>{copy.stopSheet.reason}</span>
              <strong>
                {getCategoryLabel(stop.requestedCategory)} {copy.stopSheet.matched}
              </strong>
            </article>
          </div>
          <section className="ugc-quote">
            <strong>
              {isLivePoi ? copy.stopSheet.summary : `${stop.ugc.author}${copy.stopSheet.authorNote}`}
            </strong>
            <p>{stop.ugc.title}</p>
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
