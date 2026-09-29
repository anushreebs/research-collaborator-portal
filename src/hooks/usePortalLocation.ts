import { useCallback, useEffect, useState } from "react";

export type PortalTab = "overview" | "datasets" | "requests" | "analytics" | "notFound";
export type CatalogSort = "recent" | "title" | "records";

export type PortalLocation = {
  tab: PortalTab;
  search: string;
  domain: string;
  sort: CatalogSort;
  datasetId: string | null;
};

const validSorts: CatalogSort[] = ["recent", "title", "records"];

export function parsePortalLocation(input: string | URL = window.location.href): PortalLocation {
  const url = input instanceof URL ? input : new URL(input, window.location.origin);
  const params = url.searchParams;
  const path = url.pathname.replace(/\/$/, "") || "/";
  const tab: PortalTab =
    path === "/"
      ? "overview"
      : path === "/datasets"
        ? "datasets"
        : path === "/requests"
          ? "requests"
          : path === "/analytics"
            ? "analytics"
            : "notFound";
  const requestedSort = params.get("sort") as CatalogSort | null;
  return {
    tab,
    search: params.get("q") || "",
    domain: params.get("domain") || "All areas",
    sort: validSorts.includes(requestedSort || "recent")
      ? requestedSort || "recent"
      : "recent",
    datasetId: params.get("dataset"),
  };
}

export function portalLocationUrl(location: PortalLocation): string {
  const path =
    location.tab === "datasets"
      ? "/datasets"
      : location.tab === "requests"
        ? "/requests"
        : location.tab === "analytics"
          ? "/analytics"
          : location.tab === "notFound"
            ? "/not-found"
            : "/";
  const params = new URLSearchParams();
  if (location.tab === "datasets") {
    if (location.search) params.set("q", location.search);
    if (location.domain !== "All areas") params.set("domain", location.domain);
    if (location.sort !== "recent") params.set("sort", location.sort);
  }
  if (location.datasetId) params.set("dataset", location.datasetId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function usePortalLocation() {
  const [location, setLocation] = useState(parsePortalLocation);

  useEffect(() => {
    const onPopState = () => setLocation(parsePortalLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const move = useCallback((next: PortalLocation, replace = false) => {
    const url = portalLocationUrl(next);
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setLocation(next);
  }, []);

  const navigate = useCallback(
    (tab: PortalTab) => move({ ...location, tab, datasetId: null }),
    [location, move],
  );

  const updateCatalog = useCallback(
    (update: Partial<Pick<PortalLocation, "search" | "domain" | "sort">>) =>
      move({ ...location, tab: "datasets", datasetId: null, ...update }, true),
    [location, move],
  );

  const openDataset = useCallback(
    (datasetId: string) => move({ ...location, tab: "datasets", datasetId }),
    [location, move],
  );

  const closeDataset = useCallback(
    () => move({ ...location, datasetId: null }),
    [location, move],
  );

  const clearCatalog = useCallback(
    () =>
      move(
        { ...location, search: "", domain: "All areas", sort: "recent" },
        true,
      ),
    [location, move],
  );

  return {
    location,
    navigate,
    updateCatalog,
    openDataset,
    closeDataset,
    clearCatalog,
  };
}
