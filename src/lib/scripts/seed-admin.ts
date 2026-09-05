import "dotenv/config";

const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password) {
  throw new Error(
    "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env.",
  );
}

if (password.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}

process.env.ALLOW_BOOTSTRAP_SIGNUP = "true";

const [{ auth }, { db }, schemaModule, drizzle] = await Promise.all([
  import("../src/lib/auth"),
  import("../src/db"),
  import("../src/db/schema"),
  import("drizzle-orm"),
]);

const existing = await db
  .select({ id: schemaModule.user.id })
  .from(schemaModule.user)
  .where(drizzle.eq(schemaModule.user.email, email))
  .limit(1);

if (existing.length === 0) {
  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });
}

await db
  .update(schemaModule.user)
  .set({
    role: "admin",
    emailVerified: true,
    updatedAt: new Date(),
  })
  .where(drizzle.eq(schemaModule.user.email, email));

console.log(`Admin ready: ${email}`);
