import { t } from "../locales";

const apiBase = import.meta.env.VITE_API_URL || "";

export function apiUrl(path: string): string {
  if (import.meta.env.PROD && apiBase) {
    let endpoint: URL;
    try {
      endpoint = new URL(apiBase);
    } catch {
      throw new Error(t("api.httpsRequired"));
    }
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password
    ) {
      throw new Error(t("api.httpsRequired"));
    }
    return `${endpoint.origin}${endpoint.pathname.replace(/\/$/, "")}${path}`;
  }
  return `${apiBase}${path}`;
}

export async function gql<T>(
  query: string,
  token = "",
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(apiUrl("/graphql"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  let result: {
    errors?: { message: string; extensions?: { code?: string } }[];
    data: T;
  };
  try {
    result = await response.json();
  } catch {
    throw new Error(t("api.portalUnavailable"));
  }
  if (!response.ok || result.errors?.length) {
    const firstError = result.errors?.[0];
    if (firstError?.extensions?.code === "UNAUTHENTICATED") {
      throw new PortalSessionError();
    }
    const message = String(firstError?.message || "");
    const knownMessages: Record<string, string> = {
      "Invalid credentials": t("api.invalidCredentials"),
      "Sign in to continue": t("api.signInRequired"),
      "researcher access required": t("api.researcherRequired"),
      "admin access required": t("api.adminRequired"),
      "Dataset not found": t("api.datasetMissing"),
      "Request already exists": t("api.requestExists"),
      "Pending request not found": t("api.pendingRequestMissing"),
      "Research purpose must be 12–2000 characters": t("api.purposeLength"),
      "Too many attempts. Try again in one minute.": t("api.rateLimited"),
    };
    const safeMessage = Object.entries(knownMessages).find(
      ([known]) => known.toLowerCase() === message.toLowerCase(),
    )?.[1];
    throw new Error(safeMessage || t("api.requestFailed"));
  }
  return result.data;
}

export class PortalSessionError extends Error {
  constructor() {
    super(t("api.sessionExpired"));
    this.name = "PortalSessionError";
  }
}
