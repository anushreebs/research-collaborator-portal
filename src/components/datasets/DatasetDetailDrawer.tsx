import { useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  LockKeyhole,
  X,
} from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import type {
  AccessRequest,
  DashboardState,
  Study,
  UserRole,
} from "../../types/research";
import { t } from "../../locales";

export function DatasetDetailDrawer({
  study,
  role,
  request,
  dashboard,
  dashboardBusy,
  requestBusy,
  downloading,
  onClose,
  onRequest,
  onLoadDashboard,
  onDownload,
}: {
  study: Study;
  role: UserRole;
  request?: AccessRequest;
  dashboard: DashboardState;
  dashboardBusy: boolean;
  requestBusy: boolean;
  downloading: boolean;
  onClose: () => void;
  onRequest: (purpose: string) => Promise<boolean>;
  onLoadDashboard: () => void;
  onDownload: (study: Study) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const requestButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const purposeRef = useRef<HTMLTextAreaElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [formError, setFormError] = useState("");
  useDialogFocus(true, dialogRef, onClose);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (purpose.trim().length < 12) {
      setFormError(t("dataset.requestValidation"));
      purposeRef.current?.focus();
      return;
    }
    setFormError("");
    const succeeded = await onRequest(purpose);
    if (succeeded) {
      setPurpose("");
      setShowForm(false);
      window.requestAnimationFrame(() => confirmationRef.current?.focus());
    } else {
      setFormError(t("dataset.requestFailure"));
      purposeRef.current?.focus();
    }
  };

  const trendPoints = study.trend.map((value, index) => ({
    period: index + 1,
    value,
  }));
  const line = (values: number[]) =>
    values.map((value, index) => `${index * 42},${90 - value}`).join(" ");
  const accessStatus = request?.status || "restricted";
  const requestStatusLabel = request
    ? t(
        request.status === "pending"
          ? "dataset.statusPending"
          : request.status === "approved"
            ? "dataset.statusApproved"
            : "dataset.statusDenied",
      )
    : "";
  return (
    <div className="overlay">
      <button
        className="overlay-backdrop"
        type="button"
        aria-label={t("dataset.closeDetails")}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-detail-title"
      >
        <div className="drawer-top">
          <span>{t("dataset.details")}</span>
          <button
            type="button"
            aria-label={t("dataset.closeDetails")}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="drawer-scroll">
          <span className="id">{study.id}</span>
          <h2 id="dataset-detail-title">{study.title}</h2>
          <span className={`status ${accessStatus}`}>
            {t(
              accessStatus === "restricted"
                ? "dataset.statusRestricted"
                : accessStatus === "pending"
                  ? "dataset.statusPending"
                  : accessStatus === "approved"
                    ? "dataset.statusApproved"
                    : "dataset.statusDenied",
            )}
          </span>
          <p className="drawer-description">{study.description}</p>
          <div className="detail-stats">
            <div>
              <small>{t("dataset.records")}</small>
              <b>{study.records.toLocaleString()}</b>
            </div>
            <div>
              <small>{t("dataset.researchArea")}</small>
              <b>{study.domain}</b>
            </div>
            <div>
              <small>{t("dataset.updated")}</small>
              <b>{study.updated}</b>
            </div>
          </div>
          <div className="detail-section">
            <div className="section-title">
              <h3>{t("dataset.trend")}</h3>
              <CircleHelp size={16} aria-hidden="true" />
            </div>
            <p>
              {dashboard.mode.includes("embed URL generated")
                ? t("analytics.embedPrepared")
                : t("analytics.fallback")}
            </p>
            <button
              type="button"
              className="secondary"
              disabled={dashboardBusy}
              onClick={onLoadDashboard}
            >
              {dashboardBusy
                ? t("dataset.requestDashboard")
                : t("dataset.loadDashboard")}
            </button>
            {dashboard.url && (
              <iframe
                title="Synthetic research QuickSight dashboard"
                src={dashboard.url}
                width="100%"
                height="320"
                loading="lazy"
              />
            )}
            <p>{t("dataset.trendDisclaimer")}</p>
            <div className="chart">
              <div className="gridlines" aria-hidden="true">
                <span>80</span>
                <span>60</span>
                <span>40</span>
                <span>20</span>
              </div>
              <svg
                viewBox="0 0 294 100"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${study.title} synthetic trend`}
                aria-describedby="detail-trend-summary"
              >
                <title>{study.title} synthetic trend</title>
                <polyline
                  points={line(study.trend)}
                  fill="none"
                  stroke="#6b53db"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trendPoints.map(({ value, period }) => (
                  <circle
                    key={period}
                    cx={(period - 1) * 42}
                    cy={90 - value}
                    r="3.5"
                    fill="#6b53db"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
            <p id="detail-trend-summary" className="visually-hidden">
              Assessment measure values across periods one through eight:{" "}
              {study.trend.join(", ")}.
            </p>
            <div className="xlabels" aria-hidden="true">
              <span>{t("dataset.periodOne")}</span>
              <span>{t("dataset.periodEight")}</span>
            </div>
          </div>
          <div className="detail-section">
            <h3>{t("dataset.includedFields")}</h3>
            <div className="field-list">
              {study.fields.map((field) => (
                <span key={field}>
                  <CheckCircle2 size={15} />
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="data-note">
            <LockKeyhole size={19} aria-hidden="true" />
            <div>
              <b>{t("dataset.responsibleAccess")}</b>
              <p>{t("dataset.accessDisclosure")}</p>
            </div>
          </div>
          {request?.status === "approved" && role === "researcher" && (
            <section
              className="detail-section"
              aria-labelledby="research-files-heading"
            >
              <h3 id="research-files-heading">{t("dataset.researchFiles")}</h3>
              <p>
                {study.id}-synthetic-demo.csv · CSV ·{" "}
                {study.records.toLocaleString()} generated rows
              </p>
              <button
                type="button"
                className="primary"
                disabled={downloading}
                onClick={() => onDownload(study)}
              >
                <ArrowDownToLine size={16} />
                {downloading
                  ? t("common.preparingDownload")
                  : t("dataset.downloadAuthorized")}
              </button>
            </section>
          )}
          {showForm && !request && role === "researcher" && (
            <form className="form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="purpose">{t("dataset.requestLabel")}</label>
              <textarea
                ref={purposeRef}
                id="purpose"
                minLength={12}
                maxLength={2000}
                required
                aria-describedby={
                  formError ? "purpose-hint purpose-error" : "purpose-hint"
                }
                aria-invalid={!!formError}
                placeholder={t("dataset.requestPlaceholder")}
                value={purpose}
                onChange={(event) => {
                  setPurpose(event.target.value);
                  if (formError) setFormError("");
                }}
              />
              <small id="purpose-hint">{t("dataset.requestHint")}</small>
              {formError && (
                <p className="field-error" id="purpose-error" role="alert">
                  {formError}
                </p>
              )}
              <button
                className="primary"
                type="submit"
                disabled={requestBusy || purpose.trim().length < 12}
              >
                {requestBusy
                  ? t("common.submitting")
                  : t("dataset.submitRequest")}{" "}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
        <div className="drawer-footer">
          {role === "admin" ? (
            <p>{t("dataset.adminInstructions")}</p>
          ) : request?.status === "approved" ? (
            <button
              type="button"
              className="primary full"
              disabled={downloading}
              onClick={() => onDownload(study)}
            >
              <ArrowDownToLine size={17} />
              {downloading
                ? t("common.preparingDownload")
                : t("dataset.downloadSynthetic")}
            </button>
          ) : request ? (
            <div
              ref={confirmationRef}
              className={`footer-status ${request.status}`}
              role="status"
              tabIndex={-1}
            >
              {t("dataset.requestStatus", { status: requestStatusLabel })}
            </div>
          ) : (
            <button
              type="button"
              ref={requestButtonRef}
              className="primary full"
              onClick={() => {
                setShowForm(true);
                window.requestAnimationFrame(() => purposeRef.current?.focus());
              }}
            >
              {t("dataset.requestAccess")} <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
