import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("better-auth", () => ({ betterAuth: (options: unknown) => options }));
vi.mock("better-auth/plugins", () => ({ admin: () => ({}) }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => ({}) }));

describe("email/password authentication policy", () => {
  it("permits signup and unverified sign-in in production without an email provider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    try {
      const { auth } = await import("@/lib/auth");
      const config = auth as unknown as { emailAndPassword: { enabled: boolean; disableSignUp: boolean; requireEmailVerification: boolean }; emailVerification?: unknown };
      expect(config.emailAndPassword.enabled).toBe(true);
      expect(config.emailAndPassword.disableSignUp).toBe(false);
      expect(config.emailAndPassword.requireEmailVerification).toBe(false);
      expect(config.emailVerification).toBeUndefined();
    } finally { vi.unstubAllEnvs(); }
  });
});

describe("Neon reset scope", () => {
  it("clears every declared table except identity, credentials and account profile", () => {
    const schema = readFileSync("src/db/schema.ts", "utf8");
    const tables = [...schema.matchAll(/pgTable\(\s*"([^"]+)"/g)].map(match => match[1]);
    const sql = readFileSync("database/RESET-APP-DATA-KEEP-ACCOUNTS.sql", "utf8");
    const truncate = sql.split("TRUNCATE TABLE")[1].split("RESTART IDENTITY")[0];
    const cleared = [...truncate.matchAll(/public\."?([a-z_]+)"?/g)].map(match => match[1]);
    expect(cleared.sort()).toEqual(tables.filter(table => !["user", "account", "user_preferences"].includes(table)).sort());
    expect(truncate).not.toContain("CASCADE");
    expect(sql).toContain("BEGIN;");
    expect(sql.trim().endsWith("COMMIT;")).toBe(true);
  });
});
