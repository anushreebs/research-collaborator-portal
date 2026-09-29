import { ArrowDownToLine, Check, ShieldCheck, X } from "lucide-react";
import { EmptyState } from "../common/Feedback";
import type { AccessRequest, Study, UserRole } from "../../types/research";
import { t } from "../../locales";

export function RequestsPage({
  currentRole,
  requests,
  studies,
  loading,
  decisionBusy,
  downloadingId,
  onNavigate,
  onDecide,
  onDownload,
}: {
  currentRole: UserRole;
  requests: AccessRequest[];
  studies: Study[];
  loading: boolean;
  decisionBusy: string | null;
  downloadingId: string | null;
  onNavigate: (tab: "datasets") => void;
  onDecide: (studyId: string, approve: boolean) => void;
  onDownload: (study: Study) => void;
}) {
  return (
    <>
      <div className="eyebrow">{t("requests.eyebrow")}</div>
      <div className="page-title">
        <h1>
          {currentRole === "admin"
            ? t("requests.reviewHeading")
            : t("requests.sharedHeading")}
        </h1>
        <p>
          {currentRole === "admin"
            ? t("requests.reviewDescription")
            : t("requests.sharedDescription")}
        </p>
      </div>
      {loading ? (
        <div
          className="request-list"
          role="status"
          aria-label={t("requests.loading")}
        >
          {[1, 2].map((key) => (
            <div className="request-card request-skeleton" key={key} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title={
            currentRole === "admin"
              ? t("requests.emptyAdmin")
              : t("requests.emptyResearcher")
          }
          description={t("requests.emptyDescription")}
          action={{
            label: t("common.browseDatasets"),
            onClick: () => onNavigate("datasets"),
          }}
        />
      ) : (
        <div className="request-list">
          {requests.map((request) => {
            const study = studies.find((item) => item.id === request.studyId);
            if (!study) return null;
            return (
              <article className="request-card" key={request.studyId}>
                <div className="request-top">
                  <span className="id">{study.id}</span>
                  <span className={`status ${request.status}`}>
                    {t(
                      request.status === "pending"
                        ? "dataset.statusPending"
                        : request.status === "approved"
                          ? "dataset.statusApproved"
                          : "dataset.statusDenied",
                    )}
                  </span>
                </div>
                <h2>{study.title}</h2>
                <p>
                  <b>{t("requests.purpose")}</b> {request.purpose}
                </p>
                <small>
                  {t("requests.syntheticWorkflow", { date: request.date })}
                </small>
                <div className="request-actions">
                  {currentRole === "admin" && request.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="primary"
                        disabled={decisionBusy !== null}
                        onClick={() => onDecide(request.studyId, true)}
                      >
                        <Check size={16} />
                        {decisionBusy === request.studyId
                          ? t("common.saving")
                          : t("requests.approve")}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={decisionBusy !== null}
                        onClick={() => onDecide(request.studyId, false)}
                      >
                        <X size={16} /> {t("requests.deny")}
                      </button>
                    </>
                  )}
                  {currentRole === "researcher" &&
                    request.status === "approved" && (
                      <button
                        type="button"
                        className="primary"
                        disabled={downloadingId !== null}
                        onClick={() => onDownload(study)}
                      >
                        <ArrowDownToLine size={16} />
                        {downloadingId === request.studyId
                          ? t("common.preparingDownload")
                          : t("requests.download")}
                      </button>
                    )}
                  {currentRole === "researcher" &&
                    request.status === "pending" && (
                      <p className="request-hint" role="status">
                        <ShieldCheck size={16} /> {t("requests.waiting")}
                      </p>
                    )}
                  {currentRole === "researcher" &&
                    request.status === "denied" && (
                      <p className="request-hint">{t("requests.denied")}</p>
                    )}
                  {currentRole === "admin" && request.status !== "pending" && (
                    <p className="request-hint">
                      {t("requests.decided", {
                        status: t(
                          request.status === "approved"
                            ? "dataset.statusApproved"
                            : "dataset.statusDenied",
                        ),
                      })}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
