import { ArrowRight, Database } from "lucide-react";
import type { Study } from "../../types/research";
import { t } from "../../locales";

export function DatasetCard({
  study,
  open,
}: {
  study: Study;
  open: (study: Study) => void;
}) {
  return (
    <button type="button" className="dataset-card" onClick={() => open(study)}>
      <div className="card-top">
        <div className={`data-icon ${study.color}`}>
          <Database size={22} />
        </div>
        <span className="id">{study.id}</span>
      </div>
      <span className="category">{study.domain.toUpperCase()}</span>
      <h3>{study.title}</h3>
      <p>{study.description}</p>
      <div className="card-bottom">
        <span>
          {t("dataset.cardRecords", { count: study.records.toLocaleString() })}
        </span>
        <ArrowRight size={18} />
      </div>
    </button>
  );
}

export function DatasetCardSkeleton() {
  return (
    <div className="dataset-card skeleton-card" aria-hidden="true">
      <span className="skeleton-block skeleton-icon" />
      <span className="skeleton-block skeleton-short" />
      <span className="skeleton-block skeleton-title" />
      <span className="skeleton-block skeleton-copy" />
      <span className="skeleton-block skeleton-copy skeleton-copy-short" />
      <span className="skeleton-block skeleton-footer" />
    </div>
  );
}
