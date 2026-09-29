type Environment = Record<string, string | undefined>;

export function validateProductionConfig(env: Environment): void {
  if (env.NODE_ENV !== "production") return;
  const sessionSecret = env.SESSION_SECRET || "";
  const adminPassword = env.ADMIN_DEMO_PASSWORD || "";
  const researcherPassword = env.RESEARCHER_DEMO_PASSWORD || "";
  if (
    sessionSecret.length < 32 ||
    sessionSecret === "local-demo-only-change-before-deployment" ||
    adminPassword.length < 16 ||
    researcherPassword.length < 16 ||
    adminPassword === researcherPassword ||
    adminPassword === "admin-demo-2026" ||
    researcherPassword === "research-demo-2026"
  ) {
    throw new Error(
      "Production requires private role passwords and a random 32+ character session secret",
    );
  }
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("Production cannot disable TLS certificate verification");
  }
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required in production");
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    databaseUrl.searchParams.get("sslmode") !== "verify-full"
  ) {
    throw new Error(
      "Production DATABASE_URL must use PostgreSQL TLS with sslmode=verify-full",
    );
  }
  if (
    !databaseUrl.hostname ||
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseUrl.hostname)
  ) {
    throw new Error(
      "Production DATABASE_URL must identify a remote PostgreSQL TLS host",
    );
  }
  if (!env.WEB_ORIGIN)
    throw new Error("WEB_ORIGIN must be the exact HTTPS origin in production");
  let webOrigin: URL;
  try {
    webOrigin = new URL(env.WEB_ORIGIN);
  } catch {
    throw new Error("WEB_ORIGIN must be the exact HTTPS origin in production");
  }
  if (webOrigin.protocol !== "https:" || webOrigin.origin !== env.WEB_ORIGIN) {
    throw new Error("WEB_ORIGIN must be the exact HTTPS origin in production");
  }
  if (env.API_ORIGIN) {
    let apiOrigin: URL;
    try {
      apiOrigin = new URL(env.API_ORIGIN);
    } catch {
      throw new Error("API_ORIGIN must be an exact HTTPS origin in production");
    }
    if (
      apiOrigin.protocol !== "https:" ||
      apiOrigin.origin !== env.API_ORIGIN
    ) {
      throw new Error("API_ORIGIN must be an exact HTTPS origin in production");
    }
  }
  if (env.ENABLE_HSTS && !["true", "false"].includes(env.ENABLE_HSTS)) {
    throw new Error("ENABLE_HSTS must be true or false");
  }
}

export function shouldEmitHsts(
  env: Environment,
  forwardedProtocol: string,
  socketEncrypted: boolean,
): boolean {
  return (
    env.NODE_ENV === "production" &&
    env.ENABLE_HSTS === "true" &&
    Boolean(env.WEB_ORIGIN?.startsWith("https://")) &&
    (socketEncrypted || forwardedProtocol === "https")
  );
}
