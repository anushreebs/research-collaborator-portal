import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parsePortalLocation, usePortalLocation } from "./usePortalLocation";

describe("portal location", () => {
  it("restores filters and selected dataset from a deep link", () => {
    expect(parsePortalLocation("http://localhost/datasets?q=sleep&domain=Wellbeing&sort=title&dataset=BHP-002")).toEqual({
      tab: "datasets",
      search: "sleep",
      domain: "Wellbeing",
      sort: "title",
      datasetId: "BHP-002",
    });
  });

  it("uses replaceState for filter typing and follows browser history for drawer navigation", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => usePortalLocation());
    act(() => result.current.navigate("datasets"));
    act(() => result.current.updateCatalog({ search: "sleep" }));
    expect(replace).toHaveBeenCalled();
    expect(result.current.location.search).toBe("sleep");
    act(() => result.current.openDataset("BHP-002"));
    expect(window.location.search).toContain("dataset=BHP-002");
    act(() => result.current.closeDataset());
    expect(result.current.location.datasetId).toBeNull();
    expect(push).toHaveBeenCalledTimes(3);
    push.mockRestore();
    replace.mockRestore();
  });

  it("updates state when browser back/forward dispatches popstate", () => {
    const { result } = renderHook(() => usePortalLocation());
    window.history.replaceState(null, "", "/analytics");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(result.current.location.tab).toBe("analytics");
  });
});
