import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldEmitHsts, validateProductionConfig } from "./config.ts";

const base = {
  NODE_ENV: "production",
  SESSION_SECRET: "a".repeat(48),
  ADMIN_DEMO_PASSWORD: "admin-password-unique",
  RESEARCHER_DEMO_PASSWORD: "research-password-unique",
  DATABASE_URL:
    "postgresql://user:pass@db.example.test/portal?sslmode=verify-full",
  WEB_ORIGIN: "https://portal.example.test",
};

test("production configuration accepts verified PostgreSQL TLS and HTTPS origins", () => {
  assert.doesNotThrow(() => validateProductionConfig(base));
});

test("production configuration refuses missing TLS, disabled verification, and insecure origins", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        DATABASE_URL: "postgresql://db.example.test/portal",
      }),
    /sslmode=verify-full/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        DATABASE_URL: base.DATABASE_URL.replace("verify-full", "no-verify"),
      }),
    /sslmode=verify-full/,
  );
  assert.throws(
    () =>
      validateProductionConfig({ ...base, NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
    /cannot disable TLS certificate verification/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        WEB_ORIGIN: "http://portal.example.test",
      }),
    /exact HTTPS origin/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        API_ORIGIN: "http://api.example.test",
      }),
    /exact HTTPS origin/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        WEB_ORIGIN: "https://portal.example.test/path",
      }),
    /exact HTTPS origin/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        DATABASE_URL: "postgresql://localhost/portal?sslmode=verify-full",
      }),
    /remote PostgreSQL TLS host/,
  );
});

test("HSTS stays off until explicitly enabled after HTTPS verification", () => {
  assert.equal(shouldEmitHsts(base, "https", false), false);
  assert.equal(
    shouldEmitHsts({ ...base, ENABLE_HSTS: "true" }, "http", false),
    false,
  );
  assert.equal(
    shouldEmitHsts({ ...base, ENABLE_HSTS: "true" }, "https", false),
    true,
  );
  assert.equal(
    shouldEmitHsts({ ...base, ENABLE_HSTS: "true" }, "", true),
    true,
  );
});

test("production configuration refuses shared or undersized authentication secrets", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        ADMIN_DEMO_PASSWORD: "admin-demo-2026",
      }),
    /private role passwords/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...base,
        ADMIN_DEMO_PASSWORD: base.RESEARCHER_DEMO_PASSWORD,
      }),
    /private role passwords/,
  );
  assert.throws(
    () => validateProductionConfig({ ...base, SESSION_SECRET: "short" }),
    /private role passwords/,
  );
});
