import { useCallback, useRef, useState } from "react";
import { apiUrl, gql, PortalSessionError } from "../api/graphql";
import { operations } from "../api/operations";
import type { AccessRequest, Study } from "../types/research";
import { t } from "../locales";

export type Notify = (message: string, isError?: boolean) => void;

export function useAccessWorkflow(
  token: string,
  setRequests: React.Dispatch<React.SetStateAction<AccessRequest[]>>,
  notify: Notify,
  onSessionExpired: () => void,
) {
  const [requestBusy, setRequestBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const requestLock = useRef(false);
  const decisionLock = useRef(false);
  const downloadLock = useRef(false);

  const requestAccess = useCallback(
    async (studyId: string, purpose: string) => {
      if (
        requestLock.current ||
        purpose.trim().length < 12 ||
        purpose.length > 2000
      ) {
        return false;
      }
      requestLock.current = true;
      setRequestBusy(true);
      try {
        const { requestAccess: request } = await gql<{
          requestAccess: AccessRequest;
        }>(operations.requestAccess, token, { studyId, purpose });
        setRequests((current) => [
          ...current.filter((item) => item.studyId !== studyId),
          request,
        ]);
        notify(t("feedback.requestSucceeded"));
        return true;
      } catch (cause) {
        if (cause instanceof PortalSessionError) onSessionExpired();
        notify(
          cause instanceof Error ? cause.message : t("feedback.requestFailed"),
          true,
        );
        return false;
      } finally {
        requestLock.current = false;
        setRequestBusy(false);
      }
    },
    [notify, onSessionExpired, setRequests, token],
  );

  const decideAccess = useCallback(
    async (studyId: string, approve: boolean) => {
      if (decisionLock.current) return false;
      decisionLock.current = true;
      setDecisionBusy(studyId);
      try {
        const { decideAccess: request } = await gql<{
          decideAccess: AccessRequest;
        }>(operations.decideAccess, token, { studyId, approve });
        setRequests((current) =>
          current.map((item) => (item.studyId === studyId ? request : item)),
        );
        notify(
          t("feedback.decisionSucceeded", {
            decision: approve ? "approved" : "denied",
          }),
        );
        return true;
      } catch (cause) {
        if (cause instanceof PortalSessionError) onSessionExpired();
        notify(
          cause instanceof Error ? cause.message : t("feedback.decisionFailed"),
          true,
        );
        return false;
      } finally {
        decisionLock.current = false;
        setDecisionBusy(null);
      }
    },
    [notify, onSessionExpired, setRequests, token],
  );

  const download = useCallback(
    async (study: Study) => {
      if (downloadLock.current) return false;
      downloadLock.current = true;
      setDownloadingId(study.id);
      try {
        const response = await fetch(
          apiUrl(`/download/${encodeURIComponent(study.id)}`),
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          if (response.status === 401) {
            onSessionExpired();
            throw new Error(t("feedback.sessionExpired"));
          }
          if (response.status === 403) {
            throw new Error(t("feedback.approvedRequired"));
          }
          if (response.status === 502) {
            throw new Error(t("feedback.storageUnavailable"));
          }
          throw new Error(t("feedback.downloadFailed"));
        }

        let url: string;
        let localObjectUrl = false;
        if (
          response.headers.get("content-type")?.includes("application/json")
        ) {
          const result = (await response.json()) as { url?: unknown };
          if (typeof result.url !== "string") {
            throw new Error(t("feedback.downloadLinkMissing"));
          }
          const signedUrl = new URL(result.url);
          if (signedUrl.protocol !== "https:") {
            throw new Error(t("feedback.downloadLinkInvalid"));
          }
          url = signedUrl.href;
        } else {
          url = URL.createObjectURL(await response.blob());
          localObjectUrl = true;
        }

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${study.id}-synthetic-demo.csv`;
        anchor.rel = "noopener";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        if (localObjectUrl)
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify(
          localObjectUrl
            ? t("feedback.localDownloaded")
            : t("feedback.secureDownloadStarted"),
        );
        return true;
      } catch (cause) {
        const message =
          cause instanceof TypeError
            ? t("feedback.networkFailed")
            : cause instanceof Error
              ? cause.message
              : t("feedback.downloadFailed");
        notify(message, true);
        return false;
      } finally {
        downloadLock.current = false;
        setDownloadingId(null);
      }
    },
    [notify, onSessionExpired, token],
  );

  return {
    requestAccess,
    requestBusy,
    decideAccess,
    decisionBusy,
    download,
    downloadingId,
  };
}
