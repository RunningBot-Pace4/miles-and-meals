"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import {
  avatarColors,
  avatarIcons,
  getAvatarColor,
  getAvatarSymbol,
  type AvatarColor,
  type AvatarIcon,
} from "@/lib/avatar";

export function ProfileSettingsForm({
  name: initialName,
  initialColor,
  initialIcon,
}: {
  name: string;
  initialColor: AvatarColor;
  initialIcon: AvatarIcon;
}) {
  const [name, setName] =
    useState(initialName);
  const [avatarColor, setAvatarColor] =
    useState<AvatarColor>(initialColor);
  const [avatarIcon, setAvatarIcon] =
    useState<AvatarIcon>(initialIcon);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  const color = useMemo(
    () => getAvatarColor(avatarColor),
    [avatarColor],
  );

  const previewName =
    name.trim() || initialName;
  const symbol = getAvatarSymbol(
    avatarIcon,
    previewName,
  );

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/account/profile",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            avatarColor,
            avatarIcon,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as {
          error?: string;
          name?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to update profile.",
        );
      }

      setMessage("Profile updated.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update profile.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Saving your profile"
          message="Updating your name and how you appear to your travel crew."
        />
      ) : null}

      <form
        className="profile-settings-form stack"
        onSubmit={submit}
      >
        <div className="profile-preview">
          <span
            className="profile-preview-avatar"
            style={{
              background:
                color.background,
              color:
                color.foreground,
            }}
          >
            {symbol}
          </span>

          <div>
            <strong>{previewName}</strong>
            <small>
              Your name and avatar appear throughout the shared trip.
            </small>
          </div>
        </div>

        <label className="profile-name-field">
          User name
          <input
            name="name"
            type="text"
            minLength={2}
            maxLength={100}
            required
            autoComplete="name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Your display name"
          />
          <small>
            This changes the name shown to your travel crew. Your login email stays the same.
          </small>
        </label>

        <fieldset className="avatar-picker">
          <legend>Choose an avatar</legend>

          <div className="avatar-icon-grid">
            {avatarIcons.map((item) => {
              const selected =
                avatarIcon === item.value;
              const preview =
                getAvatarSymbol(
                  item.value,
                  previewName,
                );

              return (
                <button
                  className={
                    selected
                      ? "avatar-choice selected"
                      : "avatar-choice"
                  }
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setAvatarIcon(
                      item.value,
                    )
                  }
                >
                  <span>{preview}</span>
                  <small>
                    {item.label}
                  </small>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="avatar-picker">
          <legend>Choose a color</legend>

          <div className="avatar-color-grid">
            {avatarColors.map((item) => {
              const selected =
                avatarColor ===
                item.value;

              return (
                <button
                  className={
                    selected
                      ? "color-choice selected"
                      : "color-choice"
                  }
                  key={item.value}
                  type="button"
                  aria-label={
                    item.label
                  }
                  aria-pressed={
                    selected
                  }
                  onClick={() =>
                    setAvatarColor(
                      item.value,
                    )
                  }
                >
                  <span
                    style={{
                      background:
                        item.background,
                    }}
                  />
                  <small>
                    {item.label}
                  </small>
                </button>
              );
            })}
          </div>
        </fieldset>

        {message ? (
          <p className="success-text">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="error-text">
            {error}
          </p>
        ) : null}

        <button
          className="button primary"
          disabled={busy}
          type="submit"
        >
          {busy ? (
            <>
              <span
                className="button-spinner"
                aria-hidden="true"
              />
              Saving…
            </>
          ) : (
            "Save profile"
          )}
        </button>
      </form>
    </>
  );
}
