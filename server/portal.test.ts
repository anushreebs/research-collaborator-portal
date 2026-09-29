import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHmac } from "node:crypto";
import { canDownload, db, yoga, server } from "./index.ts";
let base = "";
type TestGraphQLData = {
  login: { token: string; expiresAt?: number };
  studies: { id: string; title?: string }[];
  requestAccess: { status: string };
  decideAccess: { status: string };
};
type TestGraphQLResponse = {
  data?: Partial<TestGraphQLData>;
  errors?: { message: string; extensions?: { code?: string } }[];
};
function must<T>(value: T | null | undefined): T {
  assert.ok(value);
  return value;
}
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
  await db.close();
});

async function query(
  source: string,
  token = "",
  variables: Record<string, unknown> = {},
) {
  const response = await yoga.fetch(
    new Request("http://localhost:4000/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: source, variables }),
    }),
  );
  return response.json() as Promise<TestGraphQLResponse>;
}

function testToken(role: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ role, exp: expiresAt })).toString("base64url");
  const signature = createHmac("sha256", "local-demo-only-change-before-deployment")
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

test("researcher must receive approval before downloading; admin alone can decide", async () => {
  await db.query("DELETE FROM access_requests WHERE study_id=$1", ["BHP-001"]);
  const researcherLogin = await query(
    'mutation { login(role:"researcher", password:"research-demo-2026") { token role expiresAt } }',
  );
  const researcher = must(must(researcherLogin.data).login).token;
  const loginInfo = must(must(researcherLogin.data).login);
  assert.ok(loginInfo.expiresAt && loginInfo.expiresAt > Date.now());
  const adminLogin = await query(
    'mutation { login(role:"admin", password:"admin-demo-2026") { token } }',
  );
  const admin = must(must(adminLogin.data).login).token;
  const expired = testToken("researcher", Date.now() - 1);
  assert.equal(must((await query("{ studies { id } }", expired)).errors)[0]?.extensions?.code, "UNAUTHENTICATED");
  assert.equal(must((await query("{ requests { studyId } }")).errors)[0]?.extensions?.code, "UNAUTHENTICATED");
  assert.equal(must((await query("{ dashboard { mode } }")).errors)[0]?.extensions?.code, "UNAUTHENTICATED");
  assert.equal(must((await query("{ studies { id } }", `${researcher}tampered`)).errors)[0]?.extensions?.code, "UNAUTHENTICATED");
  assert.ok((await query('mutation { requestAccess(studyId:"BHP-001", purpose:"valid synthetic purpose") { status } }', admin)).errors);
  const catalog = await query("{ studies { id title } }", researcher);
  assert.equal(must(must(catalog.data).studies).length, 4);
  assert.equal(await canDownload("researcher", "BHP-001"), false);
  assert.equal(
    (
      await fetch(`${base}/download/BHP-001`, {
        headers: { Authorization: `Bearer ${researcher}` },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(`${base}/download/BHP-001`)).status, 401);
  assert.equal((await fetch(`${base}/download/BHP-001`, { headers: { Authorization: `Bearer ${expired}` } })).status, 401);
  assert.equal((await fetch(`${base}/download/not-a-dataset`, { headers: { Authorization: `Bearer ${researcher}` } })).status, 404);
  assert.equal((await fetch(`${base}/download/BHP-%2e%2e%2f004`, { headers: { Authorization: `Bearer ${researcher}` } })).status, 404);
  assert.equal((await fetch(`${base}/download/%E0%A4%A`, { headers: { Authorization: `Bearer ${researcher}` } })).status, 404);
  assert.equal((await fetch(`${base}/graphql`, { headers: { Origin: "https://attacker.example" } })).status, 403);
  const responseHeaders = await fetch(`${base}/health`);
  assert.equal(responseHeaders.status, 200);
  assert.equal(responseHeaders.headers.get("content-security-policy")?.includes("default-src 'self'"), true);
  const requested = await query(
    'mutation { requestAccess(studyId:"BHP-001", purpose:"Exploring synthetic trends") { status } }',
    researcher,
  );
  assert.equal(must(must(requested.data).requestAccess).status, "pending");
  assert.ok((await query('mutation { requestAccess(studyId:"BHP-001", purpose:"another synthetic purpose") { status } }', researcher)).errors);
  const forbidden = await query(
    'mutation { decideAccess(studyId:"BHP-001", approve:true) { status } }',
    researcher,
  );
  assert.match(must(forbidden.errors)[0]?.message || "", /admin access required/);
  assert.equal(await canDownload("researcher", "BHP-001"), false);
  const approved = await query(
    'mutation { decideAccess(studyId:"BHP-001", approve:true) { status } }',
    admin,
  );
  assert.equal(must(must(approved.data).decideAccess).status, "approved");
  assert.equal(await canDownload("researcher", "BHP-001"), true);
  const csv = await fetch(`${base}/download/BHP-001`, {
    headers: { Authorization: `Bearer ${researcher}` },
  });
  assert.equal(csv.status, 200);
  assert.match(must(csv.headers.get("content-type")), /text\/csv/);
  assert.match(await csv.text(), /SYN-0001/);
  assert.equal((await fetch(`${base}/download/BHP-001`)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/download/BHP-001`, {
        headers: { Authorization: `Bearer ${researcher}tampered` },
      })
    ).status,
    401,
  );
  const filtered = await query(
    '{studies(search:"Sleep",domain:"Wellbeing"){id}}',
    researcher,
  );
  assert.deepEqual(must(must(filtered.data).studies), [{ id: "BHP-002" }]);
  assert.ok((await query("{studies{id}}")).errors);
  assert.ok(
    (
      await query(
        'mutation {requestAccess(studyId:"BHP-002",purpose:"short"){status}}',
        researcher,
      )
    ).errors,
  );
  assert.equal(await canDownload("admin", "BHP-001"), false);
  assert.equal((await fetch(`${base}/download/BHP-001`, { headers: { Authorization: `Bearer ${admin}` } })).status, 403);
  assert.equal((await fetch(`${base}/download/BHP-002`, { headers: { Authorization: `Bearer ${researcher}` } })).status, 403);
  assert.ok((await query('mutation { decideAccess(studyId:"BHP-001", approve:true) { status } }', admin)).errors);
  await db.query("DELETE FROM access_requests WHERE study_id=$1", ["BHP-002"]);
  assert.equal(must(must((await query('mutation { requestAccess(studyId:"BHP-002", purpose:"Synthetic denial flow test") { status } }', researcher)).data).requestAccess).status, "pending");
  assert.equal(must(must((await query('mutation { decideAccess(studyId:"BHP-002", approve:false) { status } }', admin)).data).decideAccess).status, "denied");
  assert.ok((await query('mutation { decideAccess(studyId:"BHP-002", approve:true) { status } }', admin)).errors);
  assert.equal((await fetch(`${base}/download/BHP-002`, { headers: { Authorization: `Bearer ${researcher}` } })).status, 403);
  const aliases = Array.from({ length: 11 }, (_, index) => `a${index}: studies { id }`).join(" ");
  assert.match(must((await query(`{ ${aliases} }`, researcher)).errors)[0]?.message || "", /complexity limit/);
  assert.ok((await query(`{ studies(search:"${"s".repeat(101)}") { id } }`, researcher)).errors);
  assert.ok((await query('{ studies(domain:"Unlisted") { id } }', researcher)).errors);
  assert.ok((await query(`query { recommend(question:"${"q".repeat(501)}") { mode } }`, researcher)).errors);
  assert.ok((await query(`mutation { requestAccess(studyId:"BHP-003", purpose:"${"x".repeat(2001)}") { status } }`, researcher)).errors);
  const concurrentDuplicates = await Promise.all([
    query('mutation { requestAccess(studyId:"BHP-003", purpose:"Concurrent synthetic purpose one") { status } }', researcher),
    query('mutation { requestAccess(studyId:"BHP-003", purpose:"Concurrent synthetic purpose two") { status } }', researcher),
  ]);
  assert.equal(concurrentDuplicates.filter((result) => !result.errors).length, 1);
  await db.query("DELETE FROM access_requests WHERE study_id=$1", ["BHP-003"]);
  const oversize = await yoga.fetch(new Request("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: `{ ${" ".repeat(66_000)} }` }),
  }));
  assert.equal(oversize.status, 413);
  assert.equal((await fetch(`${base}/graphql`)).status, 405);
  await db.query("DELETE FROM access_requests WHERE study_id=$1", ["BHP-001"]);
  await db.query("DELETE FROM access_requests WHERE study_id=$1", ["BHP-002"]);
});
