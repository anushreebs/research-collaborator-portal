import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAccessWorkflow } from "./useAccessWorkflow";
import type { AccessRequest } from "../types/research";

const requestResponse = {
  data: {
    requestAccess: {
      studyId: "BHP-001",
      purpose: "Synthetic test purpose",
      status: "pending",
      date: "Sep 28, 2026",
    },
  },
};
const study = {
  id: "BHP-001",
  title: "Synthetic study",
  description: "Synthetic fixture",
  domain: "Cognition",
  records: 2,
  updated: "Sep 28, 2026",
  fields: ["score"],
  color: "violet",
  trend: [2, 3],
};

function deferredFetch() {
  const resolvers: ((response: Response) => void)[] = [];
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  return {
    fetchMock,
    resolveNext: (body: unknown) => {
      const resolve = resolvers.shift();
      if (!resolve) throw new Error("No pending fetch to resolve");
      resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  };
}

describe("access workflow duplicate prevention", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only one request when the submit callback is invoked twice before render", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const setRequests = vi.fn() as unknown as React.Dispatch<
      React.SetStateAction<AccessRequest[]>
    >;
    const notify = vi.fn();
    const { result } = renderHook(() =>
      useAccessWorkflow("token", setRequests, notify, vi.fn()),
    );

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.requestAccess(
        "BHP-001",
        "Synthetic request reason",
      );
      second = result.current.requestAccess(
        "BHP-001",
        "Synthetic request reason",
      );
    });
    expect(await second).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify(requestResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(await first).toBe(true);
    });
    expect(setRequests).toHaveBeenCalledOnce();

    let retry!: Promise<boolean>;
    await act(async () => {
      retry = result.current.requestAccess("BHP-002", "Synthetic retry reason");
      resolveFetch(
        new Response(JSON.stringify(requestResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(await retry).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate approval and download requests while recovering for the next action", async () => {
    const deferred = deferredFetch();
    vi.stubGlobal("fetch", deferred.fetchMock);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const setRequests = vi.fn() as unknown as React.Dispatch<
      React.SetStateAction<AccessRequest[]>
    >;
    const { result } = renderHook(() =>
      useAccessWorkflow("token", setRequests, vi.fn(), vi.fn()),
    );

    let decision!: Promise<boolean>;
    let duplicateDecision!: Promise<boolean>;
    act(() => {
      decision = result.current.decideAccess("BHP-001", true);
      duplicateDecision = result.current.decideAccess("BHP-001", true);
    });
    expect(await duplicateDecision).toBe(false);
    expect(deferred.fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      deferred.resolveNext({
        data: {
          decideAccess: {
            studyId: "BHP-001",
            purpose: "Synthetic request purpose",
            status: "approved",
            date: "Sep 28, 2026",
          },
        },
      });
      expect(await decision).toBe(true);
    });

    let download!: Promise<boolean>;
    let duplicateDownload!: Promise<boolean>;
    act(() => {
      download = result.current.download(study);
      duplicateDownload = result.current.download(study);
    });
    expect(await duplicateDownload).toBe(false);
    expect(deferred.fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      deferred.resolveNext({
        url: "https://synthetic-example.s3.amazonaws.com/synthetic/BHP-001.csv",
      });
      expect(await download).toBe(true);
    });
  });
});
