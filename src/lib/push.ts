import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import {
  countryMembers,
  notificationPreferences,
  notifications,
  pushSubscriptions,
} from "@/db/schema";

export type NotificationCategory =
  | "PAYMENTS"
  | "EXPENSES"
  | "PLANNER";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  countryId?: string | null;
};

type PushConfiguration = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function getConfiguration(): PushConfiguration | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey =
    process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return {
    publicKey,
    privateKey,
    subject,
  };
}

async function enabledUserIds(
  userIds: string[],
  category: NotificationCategory,
): Promise<Set<string>> {
  const uniqueIds = [...new Set(userIds)];

  if (uniqueIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({
      userId: notificationPreferences.userId,
      paymentsEnabled:
        notificationPreferences.paymentsEnabled,
      expensesEnabled:
        notificationPreferences.expensesEnabled,
      plannerEnabled:
        notificationPreferences.plannerEnabled,
    })
    .from(notificationPreferences)
    .where(
      inArray(
        notificationPreferences.userId,
        uniqueIds,
      ),
    );

  const preferences = new Map<
    string,
    {
      userId: string;
      paymentsEnabled: boolean;
      expensesEnabled: boolean;
      plannerEnabled: boolean;
    }
  >(
    rows.map((row) => [
      row.userId,
      row,
    ]),
  );

  return new Set(
    uniqueIds.filter((userId) => {
      const preference = preferences.get(userId);

      if (!preference) {
        return true;
      }

      if (category === "PAYMENTS") {
        return preference.paymentsEnabled;
      }

      if (category === "EXPENSES") {
        return preference.expensesEnabled;
      }

      return preference.plannerEnabled;
    }),
  );
}

async function recordInAppNotifications(
  userIds: string[],
  category: NotificationCategory,
  payload: PushPayload,
): Promise<void> {
  const uniqueIds = [...new Set(userIds)];

  if (uniqueIds.length === 0) {
    return;
  }

  try {
    await db.insert(notifications).values(
      uniqueIds.map((userId) => ({
        userId,
        category,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        countryId:
          payload.countryId ?? null,
      })),
    );
  } catch {
    // In-app history is best-effort and must never block the trip action.
  }
}

async function removeExpiredSubscription(
  id: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.id, id));
}

export async function listCountryMemberIds(
  countryId: string,
): Promise<string[]> {
  const rows = await db
    .select({
      userId: countryMembers.userId,
    })
    .from(countryMembers)
    .where(
      eq(
        countryMembers.countryId,
        countryId,
      ),
    );

  return rows.map((row) => row.userId);
}

export async function sendPushToUsers(
  userIds: string[],
  category: NotificationCategory,
  payload: PushPayload,
): Promise<void> {
  try {
    const enabled = await enabledUserIds(
      userIds,
      category,
    );

    if (enabled.size === 0) {
      return;
    }

    await recordInAppNotifications(
      [...enabled],
      category,
      payload,
    );

    const configuration = getConfiguration();

    if (!configuration) {
      return;
    }

    const subscriptions = await db
      .select({
        id: pushSubscriptions.id,
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(
        inArray(
          pushSubscriptions.userId,
          [...enabled],
        ),
      );

    if (subscriptions.length === 0) {
      return;
    }

    webpush.setVapidDetails(
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey,
    );

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag:
        payload.tag ??
        category.toLowerCase(),
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint:
                subscription.endpoint,
              keys: {
                p256dh:
                  subscription.p256dh,
                auth: subscription.auth,
              },
            },
            message,
            {
              TTL: 60 * 60,
              urgency: "normal",
            },
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(
                  (
                    error as {
                      statusCode?: unknown;
                    }
                  ).statusCode,
                )
              : 0;

          if (
            statusCode === 404 ||
            statusCode === 410
          ) {
            await removeExpiredSubscription(
              subscription.id,
            );
          }
        }
      }),
    );
  } catch {
    // Notifications are best-effort and must never block the trip action.
  }
}

export async function sendTestPushToUser(
  userId: string,
): Promise<{
  configured: boolean;
  delivered: number;
  expired: number;
}> {
  const configuration = getConfiguration();

  if (!configuration) {
    return {
      configured: false,
      delivered: 0,
      expired: 0,
    };
  }

  const subscriptions = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      eq(
        pushSubscriptions.userId,
        userId,
      ),
    );

  if (subscriptions.length === 0) {
    return {
      configured: true,
      delivered: 0,
      expired: 0,
    };
  }

  webpush.setVapidDetails(
    configuration.subject,
    configuration.publicKey,
    configuration.privateKey,
  );

  const message = JSON.stringify({
    title: "Miles & Meals",
    body:
      "Notifications are working on this device.",
    url: "/notifications",
    tag: "miles-meals-test",
  });

  let delivered = 0;
  let expired = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint:
              subscription.endpoint,
            keys: {
              p256dh:
                subscription.p256dh,
              auth: subscription.auth,
            },
          },
          message,
          {
            TTL: 60,
            urgency: "high",
          },
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? Number(
                (
                  error as {
                    statusCode?: unknown;
                  }
                ).statusCode,
              )
            : 0;

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          expired += 1;
          await removeExpiredSubscription(
            subscription.id,
          );
        }
      }
    }),
  );

  return {
    configured: true,
    delivered,
    expired,
  };
}

export async function sendPushToCountry(
  countryId: string,
  actorUserId: string,
  category: NotificationCategory,
  payload: PushPayload,
): Promise<void> {
  const memberIds = await listCountryMemberIds(
    countryId,
  );

  await sendPushToUsers(
    memberIds.filter(
      (userId) => userId !== actorUserId,
    ),
    category,
    {
      ...payload,
      countryId,
    },
  );
}
