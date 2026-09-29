import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { t } from "../../locales";

export function LoadingStatus({ label = t("common.loadingWorkspace") }: { label?: string }) {
  return (
    <div className="loading-status" role="status" aria-label={label}>
      <span /><span /><span />
      <span className="visually-hidden">{label}…</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="empty" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>{t("common.noWorkspace")}</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>{t("common.tryAgain")}</button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty">
      <Info size={24} aria-hidden="true" />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

export function Toast({
  message,
  isError,
}: {
  message: string;
  isError: boolean;
}) {
  return (
    <div className="toast" role={isError ? "alert" : "status"}>
      {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  );
}
