import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { after } from "next/server";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { schema, session } from "@/db/schema";

function hostFromUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
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
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_BOOTSTRAP_SIGNUP !== "true",
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    sendResetPassword: async ({ user, url }) => {
      after(async () => {
        try {
          await sendPasswordResetEmail({
            to: user.email,
            url,
          });
        } catch (error) {
          console.error(
            "[Miles & Meals] Unable to send password reset email.",
            error,
          );
        }
      });
    },
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
      "/request-password-reset": {
        window: 60,
        max: 3,
      },
      "/reset-password": {
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
