import type { ReactNode } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  ChevronDown,
  Database,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import type { PortalTab } from "../../hooks/usePortalLocation";
import type { UserRole } from "../../types/research";
import { t } from "../../locales";

const tabTitle: Record<PortalTab, string> = {
  overview: t("navigation.overview"),
  datasets: t("navigation.catalog"),
  requests: t("navigation.accessRequests"),
  analytics: t("navigation.analytics"),
  notFound: t("common.pageNotFound"),
};

export function AppShell({
  children,
  role,
  tab,
  pendingCount,
  isLocalDemo,
  hasSession,
  onNavigate,
  onRoleChange,
  onSignOut,
  hasOpenDataset,
}: {
  children: ReactNode;
  role: UserRole;
  tab: PortalTab;
  pendingCount: number;
  isLocalDemo: boolean;
  hasSession: boolean;
  onNavigate: (tab: PortalTab) => void;
  onRoleChange: (role: UserRole) => void;
  onSignOut: () => void;
  hasOpenDataset: boolean;
}) {
  const navItems = [
    {
      tab: "overview" as const,
      label: t("navigation.overview"),
      icon: LayoutDashboard,
    },
    {
      tab: "datasets" as const,
      label: t("navigation.catalog"),
      icon: Database,
    },
    {
      tab: "requests" as const,
      label:
        role === "admin"
          ? t("navigation.reviewRequests")
          : t("navigation.sharedRequests"),
      icon: ShieldCheck,
    },
    {
      tab: "analytics" as const,
      label: t("navigation.analytics"),
      icon: ChartNoAxesCombined,
    },
  ];

  return (
    <div className="shell">
      <aside className="sidebar" inert={hasOpenDataset}>
        <div className="brand">
          <div className="brandmark">
            <Activity size={22} />
          </div>
          <div>
            <b>
              Research<span>Link</span>
            </b>
            <small>{t("common.researchLinkPortal")}</small>
          </div>
        </div>
        <div className="workspace-label">{t("common.workspace")}</div>
        <nav aria-label={t("common.mainNavigation")}>
          {navItems.map(({ tab: target, label, icon: Icon }) => (
            <button
              type="button"
              key={target}
              className={tab === target ? "active" : ""}
              aria-current={tab === target ? "page" : undefined}
              onClick={() => onNavigate(target)}
            >
              <Icon size={18} />
              {label}
              {target === "requests" && pendingCount > 0 && (
                <em>{pendingCount}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="notice">
            <Activity size={18} />
            <b>{t("shell.prototypeLabel")}</b>
            <p>{t("common.independentSidebar")}</p>
          </div>
          <div className="profile">
            <div className="avatar" aria-hidden="true">
              {role === "admin" ? "AD" : "RS"}
            </div>
            <div>
              <b>
                {t(
                  role === "admin"
                    ? "common.adminProfile"
                    : "common.researcherProfile",
                )}
              </b>
              <small>
                {t(
                  role === "admin"
                    ? "common.administrator"
                    : "common.researcher",
                )}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <main inert={hasOpenDataset}>
        <div className="synthetic-banner" role="note">
          {t("shell.syntheticBanner")}
        </div>
        <header className="topbar">
          <nav className="crumb" aria-label={t("common.breadcrumb")}>
            {t("common.workspace")} <span aria-hidden="true">/</span>{" "}
            {tabTitle[tab]}
          </nav>
          <div className="role-control">
            {!isLocalDemo && hasSession && (
              <button type="button" className="secondary" onClick={onSignOut}>
                {t("common.signOut")}
              </button>
            )}
            <label className="visually-hidden" htmlFor="demo-role">
              {t("common.roleSwitch")}
            </label>
            <select
              id="demo-role"
              aria-label={t("common.demoRole")}
              value={role}
              onChange={(event) => onRoleChange(event.target.value as UserRole)}
            >
              <option value="researcher">{t("common.researcher")}</option>
              <option value="admin">{t("common.admin")}</option>
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
