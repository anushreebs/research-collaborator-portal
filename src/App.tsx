import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gql } from "./api/graphql";
import { operations } from "./api/operations";
import { AppShell } from "./components/layout/AppShell";
import { SignInForm } from "./components/auth/SignInForm";
import { AnalyticsPage } from "./components/analytics/AnalyticsPage";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { DatasetCatalogPage } from "./components/datasets/DatasetCatalogPage";
import { DatasetDetailDrawer } from "./components/datasets/DatasetDetailDrawer";
import { RequestsPage } from "./components/requests/RequestsPage";
import {
  EmptyState,
  ErrorState,
  LoadingStatus,
  Toast,
} from "./components/common/Feedback";
import { useAccessWorkflow } from "./hooks/useAccessWorkflow";
import { usePortalLocation } from "./hooks/usePortalLocation";
import { usePortalSession } from "./hooks/usePortalSession";
import type { DashboardState, Study, UserRole } from "./types/research";
import "./style.css";
import { t } from "./locales";

const defaultDashboard: DashboardState = {
  mode: t("analytics.fallback"),
  url: null,
};

export default function App() {
  const [role, setRole] = useState<UserRole>("researcher");
  return <PortalWorkspace key={role} role={role} onRoleChange={setRole} />;
}

function PortalWorkspace({
  role,
  onRoleChange,
}: {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}) {
  const location = usePortalLocation();
  const datasetOpenerRef = useRef<HTMLElement | null>(null);
  const session = usePortalSession(role);
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [dashboardBusy, setDashboardBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastIsError, setToastIsError] = useState(false);
  const notify = useCallback((message: string, isError = false) => {
    setToast(message);
    setToastIsError(isError);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const workflow = useAccessWorkflow(
    session.token,
    session.setRequests,
    notify,
    session.expireSession,
  );
  const selected =
    session.studies.find((study) => study.id === location.location.datasetId) ||
    null;
  const selectedRequest = selected
    ? session.requests.find((request) => request.studyId === selected.id)
    : undefined;
  const pendingCount = session.requests.filter(
    (request) => request.status === "pending",
  ).length;
  const filters = useMemo(
    () => ({
      search: location.location.search,
      domain: location.location.domain,
      sort: location.location.sort,
    }),
    [
      location.location.domain,
      location.location.search,
      location.location.sort,
    ],
  );

  const loadDashboard = useCallback(async () => {
    if (!session.token || dashboardBusy) return;
    setDashboardBusy(true);
    try {
      const result = await gql<{ dashboard: DashboardState }>(
        operations.dashboard,
        session.token,
      );
      setDashboard(result.dashboard);
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : t("feedback.dashboardError"),
        true,
      );
    } finally {
      setDashboardBusy(false);
    }
  }, [dashboardBusy, notify, session.token]);

  const changeRole = (nextRole: UserRole) => {
    if (nextRole === role) return;
    location.closeDataset();
    onRoleChange(nextRole);
  };

  const openDataset = useCallback(
    (study: Study) => {
      datasetOpenerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      location.openDataset(study.id);
    },
    [location.openDataset],
  );

  const closeDataset = useCallback(() => {
    location.closeDataset();
    window.requestAnimationFrame(() => {
      if (datasetOpenerRef.current?.isConnected)
        datasetOpenerRef.current.focus();
    });
  }, [location.closeDataset]);

  const submitSignIn = () => {
    session.signIn();
  };

  const renderPage = () => {
    if (session.error) {
      return (
        <>
          <ErrorState message={session.error} onRetry={session.retry} />
          {!session.isLocalDemo && !session.token && (
            <SignInForm
              role={role}
              password={session.password}
              onPasswordChange={session.setPassword}
              onSubmit={submitSignIn}
              submitting={session.loading}
            />
          )}
        </>
      );
    }
    if (!session.isLocalDemo && !session.token) {
      return (
        <SignInForm
          role={role}
          password={session.password}
          onPasswordChange={session.setPassword}
          onSubmit={submitSignIn}
          submitting={session.signedIn && session.loading}
        />
      );
    }
    if (!session.token) {
      return <LoadingStatus label={t("common.loadingWorkspace")} />;
    }
    switch (location.location.tab) {
      case "overview":
        return (
          <DashboardPage
            studies={session.studies}
            requests={session.requests}
            loading={session.loading}
            role={role}
            onNavigate={location.navigate}
            onOpenDataset={openDataset}
          />
        );
      case "datasets":
        return (
          <DatasetCatalogPage
            studies={session.studies}
            loading={session.loading}
            currentRole={role}
            token={session.token}
            filters={filters}
            onFiltersChange={location.updateCatalog}
            onClearFilters={location.clearCatalog}
            onOpenDataset={openDataset}
          />
        );
      case "requests":
        return (
          <RequestsPage
            currentRole={role}
            requests={session.requests}
            studies={session.studies}
            loading={session.loading}
            decisionBusy={workflow.decisionBusy}
            downloadingId={workflow.downloadingId}
            onNavigate={location.navigate}
            onDecide={(id, approve) => void workflow.decideAccess(id, approve)}
            onDownload={(study) => void workflow.download(study)}
          />
        );
      case "analytics":
        return (
          <AnalyticsPage
            studies={session.studies}
            loading={session.loading}
            dashboard={dashboard}
            dashboardBusy={dashboardBusy}
            canRequestEmbed={!!session.token}
            onLoadDashboard={() => void loadDashboard()}
          />
        );
      case "notFound":
        return (
          <EmptyState
            title={t("common.pageNotFound")}
            description={t("common.invalidPage")}
            action={{
              label: t("common.returnOverview"),
              onClick: () => location.navigate("overview"),
            }}
          />
        );
    }
  };

  return (
    <AppShell
      role={role}
      tab={location.location.tab}
      pendingCount={pendingCount}
      isLocalDemo={session.isLocalDemo}
      hasSession={!!session.token}
      onNavigate={location.navigate}
      onRoleChange={changeRole}
      onSignOut={session.signOut}
      hasOpenDataset={!!selected}
    >
      {renderPage()}
      {selected &&
        createPortal(
          <DatasetDetailDrawer
            key={selected.id}
            study={selected}
            role={role}
            request={selectedRequest}
            dashboard={dashboard}
            dashboardBusy={dashboardBusy}
            requestBusy={workflow.requestBusy}
            downloading={workflow.downloadingId === selected.id}
            onClose={closeDataset}
            onRequest={(purpose) =>
              workflow.requestAccess(selected.id, purpose)
            }
            onLoadDashboard={() => void loadDashboard()}
            onDownload={(study: Study) => void workflow.download(study)}
          />,
          document.body,
        )}
      {toast && <Toast message={toast} isError={toastIsError} />}
    </AppShell>
  );
}
