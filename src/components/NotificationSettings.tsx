"use client";

import {
  useEffect,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

type Preferences = {
  paymentsEnabled: boolean;
  expensesEnabled: boolean;
  plannerEnabled: boolean;
};

type SettingsPayload = {
  preferences: Preferences;
  subscribed: boolean;
  configured: boolean;
  publicKey: string;
};

function base64UrlToArrayBuffer(
  base64Url: string,
): ArrayBuffer {
  const padding = "=".repeat(
    (4 - (base64Url.length % 4)) % 4,
  );
  const base64 = (
    base64Url + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);

  for (
    let index = 0;
    index < raw.length;
    index += 1
  ) {
    output[index] = raw.charCodeAt(index);
  }

  return buffer;
}

export function NotificationSettings() {
  const [preferences, setPreferences] =
    useState<Preferences>({
      paymentsEnabled: true,
      expensesEnabled: true,
      plannerEnabled: true,
    });
  const [configured, setConfigured] =
    useState(false);
  const [publicKey, setPublicKey] =
    useState("");
  const [subscribed, setSubscribed] =
    useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          "/api/notifications/preferences",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load notification settings.",
          );
        }

        const payload =
          (await response.json()) as SettingsPayload;

        if (cancelled) {
          return;
        }

        setPreferences(payload.preferences);
        setSubscribed(payload.subscribed);
        setConfigured(payload.configured);
        setPublicKey(payload.publicKey);

        if ("Notification" in window) {
          setPermission(Notification.permission);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load notification settings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function savePreferences(
    next: Preferences,
  ) {
    setPreferences(next);
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/notifications/preferences",
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(next),
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to save notification preferences.",
        );
      }

      setMessage("Notification preferences saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save notification preferences.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (
        !configured ||
        !publicKey
      ) {
        throw new Error(
          "Push notifications are not configured yet. Generate VAPID keys and add them to Vercel.",
        );
      }

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error(
          "This browser does not support Web Push.",
        );
      }

      const requested =
        await Notification.requestPermission();

      setPermission(requested);

      if (requested !== "granted") {
        throw new Error(
          "Notification permission was not granted.",
        );
      }

      const registration =
        await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              base64UrlToArrayBuffer(publicKey),
          });
      }

      const json = subscription.toJSON();

      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        throw new Error(
          "The browser returned an incomplete push subscription.",
        );
      }

      const response = await fetch(
        "/api/notifications/subscription",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: {
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
          }),
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to save push subscription.",
        );
      }

      setSubscribed(true);
      setMessage(
        "Push notifications are enabled on this device.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!("serviceWorker" in navigator)) {
        setSubscribed(false);
        return;
      }

      const registration =
        await navigator.serviceWorker.ready;
      const subscription =
        await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch(
          "/api/notifications/subscription",
          {
            method: "DELETE",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          },
        );

        await subscription.unsubscribe();
      }

      setSubscribed(false);
      setMessage(
        "Push notifications are disabled on this device.",
      );
    } catch {
      setError(
        "Unable to disable notifications on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="settings-card">
        <p className="muted">
          Loading notification settings…
        </p>
      </section>
    );
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Updating notifications"
          message="Saving your Phase 8 notification preferences."
        />
      ) : null}

      <section className="settings-card notification-settings-card">
        <div>
          <p className="eyebrow">THIS DEVICE</p>
          <h2>Push notifications</h2>
          <p className="muted">
            {subscribed
              ? "This device is subscribed."
              : "Enable notifications to receive trip updates even when the app is closed."}
          </p>

          <div className="notification-device-row">
            <span
              className={
                subscribed
                  ? "status-pill success"
                  : "status-pill"
              }
            >
              {subscribed
                ? "Enabled"
                : "Not enabled"}
            </span>
            <span className="muted">
              Permission: {permission}
            </span>
          </div>

          {!configured ? (
            <div className="info-card">
              <strong>
                Admin setup required once
              </strong>
              <p>
                Run <code>npm run push:keys</code>,
                then add the three VAPID environment
                variables to Vercel.
              </p>
            </div>
          ) : null}

          <div className="form-actions notification-actions">
            {subscribed ? (
              <button
                className="button secondary"
                type="button"
                onClick={disablePush}
                disabled={busy}
              >
                Disable on this device
              </button>
            ) : (
              <button
                className="button primary"
                type="button"
                onClick={enablePush}
                disabled={busy || !configured}
              >
                Enable push notifications
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="settings-card notification-settings-card">
        <div>
          <p className="eyebrow">WHAT TO NOTIFY</p>
          <h2>Notification preferences</h2>

          <div className="notification-preference-list">
            <label className="notification-preference-row">
              <span>
                <strong>Payments</strong>
                <small>
                  Mark Paid, received and settlement confirmations
                </small>
              </span>
              <input
                type="checkbox"
                checked={preferences.paymentsEnabled}
                onChange={(event) =>
                  void savePreferences({
                    ...preferences,
                    paymentsEnabled:
                      event.target.checked,
                  })
                }
              />
            </label>

            <label className="notification-preference-row">
              <span>
                <strong>Expenses</strong>
                <small>
                  New, edited and deleted shared expenses
                </small>
              </span>
              <input
                type="checkbox"
                checked={preferences.expensesEnabled}
                onChange={(event) =>
                  void savePreferences({
                    ...preferences,
                    expensesEnabled:
                      event.target.checked,
                  })
                }
              />
            </label>

            <label className="notification-preference-row">
              <span>
                <strong>Planner</strong>
                <small>
                  New and changed itinerary, food, shopping and bookings
                </small>
              </span>
              <input
                type="checkbox"
                checked={preferences.plannerEnabled}
                onChange={(event) =>
                  void savePreferences({
                    ...preferences,
                    plannerEnabled:
                      event.target.checked,
                  })
                }
              />
            </label>
          </div>

          {message ? (
            <p className="form-success" role="status">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
