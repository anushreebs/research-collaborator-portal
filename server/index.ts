import { syntheticCsv } from "./synthetic.ts";
import { dashboard } from "./dashboard.ts";
import { recommend, type Metadata } from "./recommendations.ts";
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { db } from "./database.ts";
import { shouldEmitHsts, validateProductionConfig } from "./config.ts";
import { createYoga, createSchema } from "graphql-yoga";
import {
  GraphQLError,
  NoSchemaIntrospectionCustomRule,
  type ValidationRule,
} from "graphql";
import type { Plugin } from "graphql-yoga";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const WEB_ORIGIN = process.env.WEB_ORIGIN;
const API_ORIGIN = process.env.API_ORIGIN || WEB_ORIGIN;
validateProductionConfig(process.env);
const SESSION_SECRET =
  process.env.SESSION_SECRET || "local-demo-only-change-before-deployment";
const SESSION_TTL_MS = 3_600_000;
export { db };
await db.exec(
  readFileSync(
    new URL("./migrations/001-initial.sql", import.meta.url),
    "utf8",
  ),
);
const seeds = [
  [
    "BHP-001",
    "Cognitive Performance & Daily Habits",
    "Explore relationships between everyday habits and cognitive performance across repeated assessments.",
    "Cognition",
    842,
    "Sep 12, 2026",
    [
      "Participant ID",
      "Assessment period",
      "Reasoning score",
      "Sleep duration",
      "Activity level",
    ],
    [32, 45, 41, 52, 56, 63, 68, 72],
  ],
  [
    "BHP-002",
    "Sleep & Wellbeing Patterns",
    "A longitudinal view of self-reported sleep, energy, and wellbeing measures.",
    "Wellbeing",
    615,
    "Aug 28, 2026",
    [
      "Participant ID",
      "Assessment period",
      "Sleep quality",
      "Energy score",
      "Wellbeing score",
    ],
    [28, 36, 43, 39, 54, 60, 58, 70],
  ],
  [
    "BHP-003",
    "Brain Imaging Summary Measures",
    "Aggregate imaging-derived measures for exploratory, cross-study research.",
    "Imaging",
    294,
    "Jul 19, 2026",
    [
      "Scan ID",
      "Imaging modality",
      "Visit number",
      "Region summary",
      "Quality flag",
    ],
    [42, 39, 49, 51, 57, 53, 64, 69],
  ],
  [
    "BHP-004",
    "Training Engagement Trends",
    "Participation and engagement trends across a synthetic cognitive training program.",
    "Intervention",
    1084,
    "Sep 21, 2026",
    [
      "Participant ID",
      "Session number",
      "Completion",
      "Engagement score",
      "Assessment period",
    ],
    [25, 34, 31, 43, 46, 56, 62, 76],
  ],
] as const;
for (const s of seeds)
  await db.query(
    "INSERT INTO studies (id,title,description,domain,records,updated,fields,trend) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) ON CONFLICT (id) DO NOTHING",
    [
      s[0],
      s[1],
      s[2],
      s[3],
      s[4],
      s[5],
      JSON.stringify(s[6]),
      JSON.stringify(s[7]),
    ],
  );

async function limit(bucket: string, max: number) {
  const window = Math.floor(Date.now() / 60000);
  const result = await db.query<{ count: number }>(
    "INSERT INTO rate_limits(bucket,window_id,count) VALUES($1,$2,1) ON CONFLICT(bucket) DO UPDATE SET window_id=$2,count=CASE WHEN rate_limits.window_id=$2 THEN rate_limits.count+1 ELSE 1 END RETURNING count",
    [bucket, window],
  );
  if (result.rows[0].count > max)
    throw new GraphQLError("Too many attempts. Try again in one minute.");
}
const complexityRule: ValidationRule = (context) => {
  let depth = 0;
  let fieldCount = 0;
  let aliasCount = 0;
  let hasReported = false;
  const reportLimit = () => {
    if (!hasReported) {
      hasReported = true;
      context.reportError(
        new GraphQLError("Query exceeds the portal complexity limit"),
      );
    }
  };
  return {
    Field: {
      enter(node) {
        depth += 1;
        fieldCount += 1;
        if (node.alias) aliasCount += 1;
        if (depth > 8 || fieldCount > 40 || aliasCount > 10) reportLimit();
      },
      leave() {
        depth -= 1;
      },
    },
  };
};
const queryGuard: Plugin = {
  onValidate({ addValidationRule }) {
    addValidationRule(complexityRule);
    if (IS_PRODUCTION) addValidationRule(NoSchemaIntrospectionCustomRule);
  },
};
type Role = "researcher" | "admin";
type Context = { role: Role | null };
const sign = (role: Role) => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ role, exp: expiresAt }),
  ).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return { token: `${payload}.${signature}`, role, expiresAt };
};
const verify = (token: string): Role | null => {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || token.split(".").length !== 2) return null;
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(signature),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() && ["researcher", "admin"].includes(data.role)
      ? data.role
      : null;
  } catch {
    return null;
  }
};
const requireAuthenticated = (context: Context) => {
  if (!context.role)
    throw new GraphQLError("Sign in to continue", {
      extensions: { code: "UNAUTHENTICATED" },
    });
};
const requireRole = (context: Context, role: Role) => {
  requireAuthenticated(context);
  if (context.role !== role)
    throw new GraphQLError(`${role} access required`, {
      extensions: { code: "FORBIDDEN" },
    });
};
const schema = createSchema<Context>({
  typeDefs: /* GraphQL */ `
    type Study {
      id: ID!
      title: String!
      description: String!
      domain: String!
      records: Int!
      updated: String!
      fields: [String!]!
      trend: [Int!]!
    }
    type AccessRequest {
      studyId: ID!
      purpose: String!
      status: String!
      date: String!
    }
    type Session {
      token: String!
      role: String!
      expiresAt: Float!
    }
    type Recommendation {
      id: ID!
      fields: [String!]!
      rationale: String!
    }
    type Recommendations {
      mode: String!
      recommendations: [Recommendation!]!
    }
    type Dashboard {
      mode: String!
      url: String
    }
    type Query {
      dashboard: Dashboard!
      recommend(question: String!): Recommendations!
      studies(search: String, domain: String): [Study!]!
      requests: [AccessRequest!]!
    }
    type Mutation {
      login(role: String!, password: String!): Session!
      requestAccess(studyId: ID!, purpose: String!): AccessRequest!
      decideAccess(studyId: ID!, approve: Boolean!): AccessRequest!
    }
  `,
  resolvers: {
    Query: {
      dashboard: async (_, __, context) => {
        requireAuthenticated(context);
        try {
          return await dashboard();
        } catch {
          return {
            mode: "QuickSight unavailable — synthetic chart fallback",
            url: null,
          };
        }
      },
      recommend: async (_, { question }: { question: string }, context) => {
        requireRole(context, "researcher");
        if (question.trim().length < 3 || question.length > 500)
          throw new GraphQLError("Research question must be 3–500 characters");
        await limit("recommend", 10);
        const catalog = await db.query<Metadata>(
          "SELECT id,title,description,domain,fields FROM studies ORDER BY id",
        );
        return recommend(question, catalog.rows);
      },
      studies: async (
        _,
        { search, domain }: { search?: string; domain?: string },
        context,
      ) => {
        requireAuthenticated(context);
        if (search && search.length > 100)
          throw new GraphQLError("Search must be 100 characters or fewer");
        if (
          domain &&
          ![
            "All areas",
            "Cognition",
            "Wellbeing",
            "Imaging",
            "Intervention",
          ].includes(domain)
        )
          throw new GraphQLError("Research area is not supported");
        const result = await db.query(
          "SELECT * FROM studies WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1 OR id ILIKE $1) AND ($2::text IS NULL OR domain = $2) ORDER BY id",
          [
            search ? `%${search}%` : null,
            domain && domain !== "All areas" ? domain : null,
          ],
        );
        return result.rows;
      },
      requests: async (_, __, context) => {
        requireAuthenticated(context);
        const result = await db.query(
          'SELECT study_id AS "studyId", purpose, status, requested_at AS date FROM access_requests ORDER BY requested_at DESC',
        );
        return result.rows;
      },
    },
    Mutation: {
      login: async (
        _,
        { role, password }: { role: string; password: string },
      ) => {
        await limit("login", 30);
        if (role !== "researcher" && role !== "admin")
          throw new GraphQLError("Invalid credentials");
        const expected =
          role === "admin"
            ? process.env.ADMIN_DEMO_PASSWORD || "admin-demo-2026"
            : process.env.RESEARCHER_DEMO_PASSWORD || "research-demo-2026";
        if (password !== expected)
          throw new GraphQLError("Invalid credentials");
        return sign(role);
      },
      requestAccess: async (
        _,
        { studyId, purpose }: { studyId: string; purpose: string },
        context,
      ) => {
        requireRole(context, "researcher");
        if (purpose.trim().length < 12 || purpose.length > 2000)
          throw new GraphQLError("Research purpose must be 12–2000 characters");
        const study = await db.query("SELECT id FROM studies WHERE id=$1", [
          studyId,
        ]);
        if (!study.rows.length) throw new GraphQLError("Dataset not found");
        const result = await db.query(
          'INSERT INTO access_requests(study_id,purpose,status,requested_at) VALUES($1,$2,$3,$4) ON CONFLICT (study_id) DO NOTHING RETURNING study_id AS "studyId",purpose,status,requested_at AS date',
          [
            studyId,
            purpose.trim(),
            "pending",
            new Date().toISOString().slice(0, 10),
          ],
        );
        if (!result.rows.length)
          throw new GraphQLError("Request already exists");
        return result.rows[0];
      },
      decideAccess: async (
        _,
        { studyId, approve }: { studyId: string; approve: boolean },
        context,
      ) => {
        requireRole(context, "admin");
        const result = await db.query(
          'UPDATE access_requests SET status=$2 WHERE study_id=$1 AND status=$3 RETURNING study_id AS "studyId",purpose,status,requested_at AS date',
          [studyId, approve ? "approved" : "denied", "pending"],
        );
        if (!result.rows.length)
          throw new GraphQLError("Pending request not found");
        return result.rows[0];
      },
    },
  },
});
export const yoga = createYoga({
  schema,
  graphiql: process.env.NODE_ENV !== "production",
  graphqlEndpoint: "/graphql",
  maxRequestBodySize: 64 * 1024,
  multipart: false,
  batching: false,
  plugins: [queryGuard],
  context: ({ request }) => ({
    role: verify(
      (request.headers.get("authorization") || "").replace(/^Bearer /, ""),
    ),
  }),
});
export async function canDownload(role: Role | null, id: string) {
  if (role !== "researcher") return false;
  const result = await db.query(
    "SELECT 1 FROM access_requests WHERE study_id=$1 AND status=$2",
    [id, "approved"],
  );
  return result.rows.length > 0;
}
export const server = createServer(async (req, res) => {
  try {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self' https://*.quicksight.aws.amazon.com",
    );
    const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const requestIsHttps = Boolean(
      (req.socket as { encrypted?: boolean }).encrypted ||
      forwardedProtocol === "https",
    );
    if (
      shouldEmitHsts(
        process.env,
        forwardedProtocol,
        Boolean((req.socket as { encrypted?: boolean }).encrypted),
      )
    ) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000");
    }
    if (IS_PRODUCTION && req.url !== "/health" && !requestIsHttps) {
      const rawPath = req.url || "/";
      const safePath =
        rawPath.startsWith("/") && !rawPath.startsWith("//")
          ? rawPath
          : `/${rawPath.replace(/^\/+/, "")}`;
      const target = new URL(safePath, API_ORIGIN);
      res.writeHead(308, { Location: target.href }).end();
      return;
    }
    if (req.url === "/health") {
      try {
        await db.query("SELECT 1");
        res.writeHead(200).end("ok");
      } catch {
        res.writeHead(503).end("Database unavailable");
      }
      return;
    }

    const requestOrigin = req.headers.origin;
    const allowedOrigin = WEB_ORIGIN || "http://localhost:5173";
    if (requestOrigin && requestOrigin !== allowedOrigin) {
      res.writeHead(403).end("Origin not allowed");
      return;
    }
    if (requestOrigin)
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    if (req.url?.startsWith("/download/")) {
      const role = verify(
        (req.headers.authorization || "").replace(/^Bearer /, ""),
      );
      if (role !== "researcher") {
        res
          .writeHead(role ? 403 : 401)
          .end("Researcher authorization required");
        return;
      }
      let id: string;
      try {
        id = decodeURIComponent(
          req.url.split("?")[0].slice("/download/".length),
        );
      } catch {
        res.writeHead(404).end("Dataset not found");
        return;
      }
      if (!/^BHP-\d{3}$/.test(id)) {
        res.writeHead(404).end("Dataset not found");
        return;
      }
      const study = await db.query<{
        id: string;
        fields: string[];
        records: number;
      }>("SELECT id,fields,records FROM studies WHERE id=$1", [id]);
      if (!study.rows.length) {
        res.writeHead(404).end("Dataset not found");
        return;
      }
      if (!(await canDownload(role, id))) {
        res.writeHead(403).end("Approved access required");
        return;
      }
      if (process.env.S3_BUCKET) {
        try {
          const url = await getSignedUrl(
            new S3Client({ region: process.env.AWS_REGION || "us-east-1" }),
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: `synthetic/${id}.csv`,
              ResponseContentDisposition: `attachment; filename="${id}-synthetic-demo.csv"`,
            }),
            { expiresIn: 60 },
          );
          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ url }));
          return;
        } catch {
          res.writeHead(502).end("S3 configuration error");
          return;
        }
      }
      res
        .writeHead(200, {
          "Content-Type": "text/csv",
          "X-Data-Source": "local-synthetic-fallback",
          "Content-Disposition": `attachment; filename="${id}-synthetic-demo.csv"`,
        })
        .end(syntheticCsv(study.rows[0]));
      return;
    }
    if (req.url?.startsWith("/graphql")) {
      if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST, OPTIONS" }).end("POST required");
        return;
      }
      await yoga(req, res);
      return;
    }
    if (process.env.NODE_ENV === "production" && req.method === "GET") {
      const pathname = new URL(req.url || "/", "http://localhost").pathname;
      const root = resolve("dist");
      const file = resolve(root, `.${pathname}`);
      if (file.startsWith(`${root}/`) && !pathname.includes("..")) {
        try {
          const content = readFileSync(file);
          if (pathname.startsWith("/assets/")) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable",
            );
          }
          res
            .writeHead(200, {
              "Content-Type":
                (
                  {
                    ".js": "text/javascript",
                    ".css": "text/css",
                    ".html": "text/html",
                    ".svg": "image/svg+xml",
                  } as Record<string, string>
                )[extname(file)] || "application/octet-stream",
            })
            .end(content);
          return;
        } catch {}
      }
      res
        .writeHead(200, { "Content-Type": "text/html" })
        .end(readFileSync(join(root, "index.html")));
      return;
    }
    res.writeHead(404).end("Not found");
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end("Request could not be completed");
  }
});
if (process.env.NODE_ENV !== "test")
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`Research portal listening on port ${PORT}`),
  );

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
