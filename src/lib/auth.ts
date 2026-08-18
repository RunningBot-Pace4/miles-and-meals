import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { schema, session } from "@/db/schema";

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return null;
  }
}

function hostFromUrl(value: string | undefined): string | null {
  const baseUrl = normalizeBaseUrl(value);

  if (!baseUrl) {
    return null;
  }

  return new URL(baseUrl).host;
}

function vercelUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return normalizeBaseUrl(
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`,
  );
}

function getFallbackBaseUrl(): string {
  return (
    normalizeBaseUrl(process.env.BETTER_AUTH_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    vercelUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    vercelUrl(process.env.VERCEL_URL) ??
    "http://localhost:3000"
  );
}

function getAllowedHosts(): string[] {
  const hosts = new Set<string>([
    "localhost:3000",
    "127.0.0.1:3000",
    "*.vercel.app",
  ]);

  const configuredHosts = [
    hostFromUrl(process.env.BETTER_AUTH_URL),
    hostFromUrl(process.env.NEXT_PUBLIC_APP_URL),
    process.env.VERCEL_URL?.trim() || null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || null,
  ];

  for (const host of configuredHosts) {
    if (host) {
      hosts.add(host);
    }
  }

  return [...hosts];
}

export const auth = betterAuth({
  appName: "Miles & Meals",
  baseURL: {
    allowedHosts: getAllowedHosts(),
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
    fallback: getFallbackBaseUrl(),
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  plugins: [admin()],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (newSession) => {
          await db
            .delete(session)
            .where(eq(session.userId, newSession.userId));

          return { data: newSession };
        },
      },
    },
  },
});
