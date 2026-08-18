import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import type { AvatarColor, AvatarIcon } from "@/lib/avatar";

export type UserPreferences = {
  avatarColor: AvatarColor;
  avatarIcon: AvatarIcon;
  mustChangePassword: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  avatarColor: "teal",
  avatarIcon: "initial",
  mustChangePassword: false,
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const rows = await db
    .select({
      avatarColor: userPreferences.avatarColor,
      avatarIcon: userPreferences.avatarIcon,
      mustChangePassword: userPreferences.mustChangePassword,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return defaultUserPreferences;
  }

  return {
    avatarColor: row.avatarColor as AvatarColor,
    avatarIcon: row.avatarIcon as AvatarIcon,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function setMustChangePassword(
  userId: string,
  required: boolean,
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({
      userId,
      mustChangePassword: required,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        mustChangePassword: required,
        updatedAt: new Date(),
      },
    });
}

export async function saveAvatarPreferences(
  userId: string,
  avatarColor: AvatarColor,
  avatarIcon: AvatarIcon,
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({
      userId,
      avatarColor,
      avatarIcon,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        avatarColor,
        avatarIcon,
        updatedAt: new Date(),
      },
    });
}
