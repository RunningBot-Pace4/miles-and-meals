import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { schema, session } from "@/db/schema";

export const auth = betterAuth({
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
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ],
});
