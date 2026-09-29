import {
  Activity,
  ArrowRight,
  Database,
  FileText,
  LockKeyhole,
} from "lucide-react";
import { DatasetCard, DatasetCardSkeleton } from "../datasets/DatasetCard";
import type { AccessRequest, Study } from "../../types/research";
import { t } from "../../locales";

export function DashboardPage({
  studies,
  requests,
  loading,
  role,
  onNavigate,
  onOpenDataset,
}: {
  studies: Study[];
  requests: AccessRequest[];
  loading: boolean;
  role: "researcher" | "admin";
  onNavigate: (tab: "datasets" | "requests") => void;
  onOpenDataset: (study: Study) => void;
}) {
  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;
  const researchAreaCount = new Set(studies.map((study) => study.domain)).size;
  return (
    <>
      <div className="eyebrow">{t("dashboard.eyebrow")}</div>
      <div className="welcome">
        <div>
          <h1>
            {t("dashboard.greeting", {
              role: t(role === "admin" ? "common.admin" : "common.researcher"),
            })}
          </h1>
          <p>{t("dashboard.summary")}</p>
        </div>
        <div className="date-pill">{t("dashboard.demoEnvironment")}</div>
      </div>
      <section className="hero" aria-labelledby="workspace-hero-title">
        <div>
          <span className="hero-tag">{t("dashboard.heroTag")}</span>
          <h2 id="workspace-hero-title">{t("dashboard.heroTitle")}</h2>
          <p>{t("dashboard.heroDescription")}</p>
          <button type="button" onClick={() => onNavigate("datasets")}>
            {t("dashboard.exploreDatasets")} <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="center-pulse">
            <Activity size={45} />
          </div>
          <div className="floating f1">
            ● &nbsp;{t("dashboard.visualCognition")}
          </div>
          <div className="floating f2">
            ● &nbsp;{t("dashboard.visualImaging")}
          </div>
          <div className="floating f3">
            ● &nbsp;{t("dashboard.visualWellbeing")}
          </div>
        </div>
      </section>
      <section aria-labelledby="workspace-metrics-title">
        <div className="section-head">
          <div>
            <h2 id="workspace-metrics-title">
              {t("dashboard.workspaceAtGlance")}
            </h2>
            <p>{t("dashboard.snapshot")}</p>
          </div>
        </div>
        {loading ? (
          <div
            className="stat-grid"
            role="status"
            aria-label={t("common.loadingMetrics")}
          >
            {[1, 2, 3].map((key) => (
              <div className="stat stat-skeleton" key={key} />
            ))}
          </div>
        ) : (
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-icon purple">
                <Database size={21} />
              </div>
              <small>{t("dashboard.availableDatasets")}</small>
              <strong>{String(studies.length).padStart(2, "0")}</strong>
              <span>
                {t("dashboard.researchAreaCount", { count: researchAreaCount })}
              </span>
            </div>
            <div className="stat">
              <div className="stat-icon cyan">
                <FileText size={21} />
              </div>
              <small>{t("dashboard.syntheticRecords")}</small>
              <strong>
                {studies
                  .reduce((total, study) => total + study.records, 0)
                  .toLocaleString()}
              </strong>
              <span>{t("dashboard.interfaceDemo")}</span>
            </div>
            <div className="stat">
              <div className="stat-icon amber">
                <LockKeyhole size={21} />
              </div>
              <small>
                {t(
                  role === "admin"
                    ? "dashboard.pendingRequests"
                    : "dashboard.sharedRequests",
                )}
              </small>
              <strong>
                {String(
                  role === "admin" ? pendingCount : requests.length,
                ).padStart(2, "0")}
              </strong>
              <span>
                {t("dashboard.awaitingReview", { count: pendingCount })}
              </span>
            </div>
          </div>
        )}
      </section>
      <section aria-labelledby="featured-datasets-title">
        <div className="section-head">
          <div>
            <h2 id="featured-datasets-title">
              {t("dashboard.featuredDatasets")}
            </h2>
            <p>{t("dashboard.featuredDescription")}</p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate("datasets")}
          >
            {t("dashboard.viewAll")} <ArrowRight size={16} />
          </button>
        </div>
        <div className="cards">
          {loading
            ? [1, 2].map((key) => <DatasetCardSkeleton key={key} />)
            : studies
                .slice(0, 2)
                .map((study) => (
                  <DatasetCard
                    key={study.id}
                    study={study}
                    open={onOpenDataset}
                  />
                ))}
        </div>
      </section>
      {requests.length === 0 && !loading && (
        <button
          type="button"
          className="text-button"
          onClick={() => onNavigate("requests")}
        >
          {t("dashboard.reviewRequests")} <ArrowRight size={16} />
        </button>
      )}
    </>
  );
}
