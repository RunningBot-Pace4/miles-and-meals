"use client";

import { FullPageLink as Link } from "@/components/FullPageLink";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getAvatarColor, getAvatarSymbol } from "@/lib/avatar";
import { SavingOverlay } from "@/components/SavingOverlay";
import { readOfflineQueue } from "@/lib/offline-queue";
import { clearPrivateDeviceData } from "@/lib/private-device-data";

type AccountMenuProps = {
  name: string;
  email: string;
  isAdmin: boolean;
  avatarColor: string;
  avatarIcon: string;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
      <path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2.5" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.7 7.7 7 10 4.3-2.3 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.6 1.6 3.7-4" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
    </svg>
  );
}

export function AccountMenu({
  name,
  email,
  isAdmin,
  avatarColor,
  avatarIcon,
}: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const color = getAvatarColor(avatarColor);
  const avatarSymbol = getAvatarSymbol(avatarIcon, name);
  const avatarStyle = {
    background: color.background,
    color: color.foreground,
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    const waiting = readOfflineQueue().length;
    if (
      waiting > 0 &&
      !window.confirm(
        `You have ${waiting} change${waiting === 1 ? "" : "s"} waiting to sync. Signing out removes those unsynced changes from this device. Sign out anyway?`,
      )
    ) {
      return;
    }

    setSigningOut(true);

    try {
      await authClient.signOut();
      clearPrivateDeviceData();
      window.location.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {signingOut ? (
        <SavingOverlay
          title="Signing you out"
          message="Closing this session and returning to sign in."
        />
      ) : null}

      <div className="account-menu" ref={menuRef}>
      <button
        className="account-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" style={avatarStyle}>{avatarSymbol}</span>
        <span className="account-trigger-copy">
          <strong>{name}</strong>
          <small>{isAdmin ? "Administrator" : "Traveler"}</small>
        </span>
        <span className={open ? "account-chevron open" : "account-chevron"}>
         ⌄
        </span>
      </button>

      {open ? (
        <div className="account-popover" role="menu">
          <div className="account-popover-head">
            <span className="account-avatar large" style={avatarStyle}>{avatarSymbol}</span>
            <div>
              <strong>{name}</strong>
              <small>{email}</small>
            </div>
          </div>

          <div className="account-menu-list">
            <Link
              className="account-menu-item"
              href="/trips"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="account-menu-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16v12H4zM8 7V5h8v2M8 11h8M12 11v8" />
                </svg>
              </span>
              <span>
                <strong>My trips</strong>
                <small>Create or manage trips you own</small>
              </span>
            </Link>

            <Link
              className="account-menu-item"
              href="/settings/password"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="account-menu-icon">
                <LockIcon />
              </span>
              <span>
                <strong>Change password</strong>
                <small>Update your login password</small>
              </span>
            </Link>

            {isAdmin ? (
              <Link
                className="account-menu-item"
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="account-menu-icon">
                  <AdminIcon />
                </span>
                <span>
                  <strong>Admin console</strong>
                  <small>People, trips and countries</small>
                </span>
              </Link>
            ) : null}

            <Link
              className="account-menu-item"
              href="/settings/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="account-menu-icon">
                <UserIcon />
              </span>
              <span>
                <strong>Profile & avatar</strong>
                <small>Choose your icon and color</small>
              </span>
            </Link>
          </div>

          <button
            className="account-menu-item account-signout"
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={handleSignOut}
          >
            <span className="account-menu-icon">
              <SignOutIcon />
            </span>
            <span>
              <strong>{signingOut ? "Signing out…" : "Sign out"}</strong>
              <small>End this session</small>
            </span>
          </button>
        </div>
      ) : null}
      </div>
    </>
  );
}
