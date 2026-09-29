import { ChartNoAxesCombined } from "lucide-react";
import { TrendChart } from "./TrendChart";
import type { DashboardState, Study } from "../../types/research";
import { t } from "../../locales";

export function AnalyticsPage({
  studies,
  loading,
  dashboard,
  dashboardBusy,
  canRequestEmbed,
  onLoadDashboard,
}: {
  studies: Study[];
  loading: boolean;
  dashboard: DashboardState;
  dashboardBusy: boolean;
  canRequestEmbed: boolean;
  onLoadDashboard: () => void;
}) {
  return (
    <section aria-labelledby="analytics-heading">
      <div className="eyebrow">{t("analytics.eyebrow")}</div>
      <div className="page-title">
        <h1 id="analytics-heading">{t("analytics.heading")}</h1>
        <p>{t("analytics.description")}</p>
      </div>
      <div className="analytics-layout">
        <article className="analytics-panel">
          <div className="section-head">
            <div>
              <h2>{t("analytics.measureTitle")}</h2>
              <p>{t("analytics.measureDescription")}</p>
            </div>
            <span className="demo-tag">{t("analytics.syntheticData")}</span>
          </div>
          {loading ? (
            <div
              role="status"
              aria-label={t("analytics.loading")}
              className="analytics-skeleton"
            >
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : studies.length ? (
            <TrendChart studies={studies} />
          ) : (
            <div className="analytics-placeholder">{t("analytics.empty")}</div>
          )}
        </article>
        <article className="analytics-panel quicksight-panel">
          <div className="section-head">
            <div>
              <h2>{t("analytics.institutionalDashboard")}</h2>
              <p>{t("analytics.quicksightDescription")}</p>
            </div>
          </div>
          <p className="integration-status">
            {dashboard.mode.includes("embed URL generated")
              ? t("analytics.embedPrepared")
              : t("analytics.fallback")}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={dashboardBusy || !canRequestEmbed}
            onClick={onLoadDashboard}
          >
            <ChartNoAxesCombined size={16} />
            {dashboardBusy
              ? t("analytics.requestingDashboard")
              : t("analytics.loadDashboard")}
          </button>
          {dashboard.url ? (
            <iframe
              className="analytics-embed"
              title={t("analytics.externalDashboardTitle")}
              src={dashboard.url}
              loading="lazy"
            />
          ) : (
            <p className="integration-note">{t("analytics.fallback")}</p>
          )}
        </article>
      </div>
    </section>
  );
}
