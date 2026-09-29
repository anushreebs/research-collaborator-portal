import { useCallback, useEffect, useMemo, useState } from "react";
import { gql, PortalSessionError } from "../api/graphql";
import { operations } from "../api/operations";
import type { AccessRequest, Study, UserRole } from "../types/research";
import { t } from "../locales";

const colorByDomain: Record<string, Study["color"]> = {
  Cognition: "violet",
  Wellbeing: "blue",
  Imaging: "teal",
  Intervention: "orange",
};
const isLocalDemoEnvironment = import.meta.env.DEV;

export function usePortalSession(role: UserRole) {
  const isLocalDemo = isLocalDemoEnvironment;
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(isLocalDemo);
  const [token, setToken] = useState("");
  const [studies, setStudies] = useState<Study[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const loginAttempt = useMemo(
    () => ({
      attempt,
      role,
      credential: isLocalDemo
        ? role === "admin"
          ? "admin-demo-2026"
          : "research-demo-2026"
        : password,
    }),
    [attempt, password, role],
  );

  useEffect(() => {
    let cancelled = false;
    setToken("");
    setStudies([]);
    setRequests([]);
    setError("");
    if (!signedIn) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void gql<{ login: { token: string; expiresAt: number } }>(
      operations.login,
      "",
      {
        role: loginAttempt.role,
        password: loginAttempt.credential,
      },
    )
      .then((result) => {
        if (!cancelled) {
          setToken(result.login.token);
          const expirationDelay = Math.max(
            0,
            result.login.expiresAt - Date.now(),
          );
          window.setTimeout(() => {
            if (!cancelled) {
              setToken("");
              setStudies([]);
              setRequests([]);
              setError(t("auth.sessionExpired"));
              setLoading(false);
            }
          }, expirationDelay);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : t("auth.signInFailed"),
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginAttempt, signedIn]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void gql<{ studies: Study[]; requests: AccessRequest[] }>(
      operations.workspace,
      token,
    )
      .then((data) => {
        if (!cancelled) {
          setStudies(
            data.studies.map((study) => ({
              ...study,
              color: colorByDomain[study.domain] || "violet",
            })),
          );
          setRequests(data.requests);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setStudies([]);
          setRequests([]);
          if (cause instanceof PortalSessionError) setToken("");
          setError(
            cause instanceof Error ? cause.message : t("auth.workspaceFailed"),
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(() => {
    setError("");
    setLoading(true);
    setSignedIn(true);
    setAttempt((value) => value + 1);
  }, []);
  const retry = useCallback(() => {
    setError("");
    setToken("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);
  const signOut = useCallback(() => {
    setSignedIn(false);
    setPassword("");
    setToken("");
    setStudies([]);
    setRequests([]);
    setError("");
    setLoading(false);
  }, []);
  const expireSession = useCallback(() => {
    setToken("");
    setStudies([]);
    setRequests([]);
    setError(t("auth.sessionExpired"));
    setLoading(false);
  }, []);

  return {
    isLocalDemo,
    password,
    setPassword,
    signedIn,
    token,
    studies,
    requests,
    setRequests,
    loading,
    error,
    signIn,
    signOut,
    expireSession,
    retry,
  };
}
