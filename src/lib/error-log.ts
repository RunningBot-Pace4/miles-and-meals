import { db } from "@/db";
import { appErrors } from "@/db/schema";

type AppErrorInput = {
  userId?: string | null;
  route?: string | null;
  message: string;
  stack?: string | null;
  digest?: string | null;
  userAgent?: string | null;
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 10000;

function trim(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, maxLength);
}

export async function recordAppError(
  input: AppErrorInput,
): Promise<void> {
  await db.insert(appErrors).values({
    userId: input.userId ?? null,
    route: trim(input.route, 500),
    message:
      trim(
        input.message,
        MAX_MESSAGE_LENGTH,
      ) ?? "Unknown error",
    stack: trim(
      input.stack,
      MAX_STACK_LENGTH,
    ),
    digest: trim(input.digest, 500),
    userAgent: trim(
      input.userAgent,
      1000,
    ),
  });
}
