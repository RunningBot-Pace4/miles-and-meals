"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  const userAgent = navigator.userAgent.toLowerCase();

  const iPadDesktopMode =
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1;

  if (
    /iphone|ipad|ipod/.test(userAgent) ||
    iPadDesktopMode
  ) {
    return "ios";
  }

  if (/android/.test(userAgent)) {
    return "android";
  }

  return "desktop";
}

function detectInstalled(): boolean {
  const navigatorWithStandalone =
    navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)")
      .matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function InstallAppCard() {
  const [platform, setPlatform] = useState<
    "ios" | "android" | "desktop"
  >("desktop");
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(detectInstalled());

    function capturePrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(
        event as BeforeInstallPromptEvent,
      );
    }

    function markInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage("Miles & Meals is installed.");
    }

    window.addEventListener(
      "beforeinstallprompt",
      capturePrompt,
    );
    window.addEventListener(
      "appinstalled",
      markInstalled,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        capturePrompt,
      );
      window.removeEventListener(
        "appinstalled",
        markInstalled,
      );
    };
  }, []);

  const guide = useMemo(() => {
    if (installed) {
      return {
        title: "Installed on this device",
        body:
          platform === "android"
            ? "Long-press the Miles & Meals icon for supported quick actions."
            : "Open Miles & Meals directly from your Home Screen.",
      };
    }

    if (platform === "ios") {
      return {
        title: "Add to iPhone / iPad Home Screen",
        body:
          "Open Miles & Meals in Safari, tap Share, then choose Add to Home Screen.",
      };
    }

    if (platform === "android") {
      return {
        title: "Add to Android Home Screen",
        body: installPrompt
          ? "Tap Install app below. After installation, long-press the app icon for quick actions."
          : "In Chrome, open the menu and choose Install app or Add to Home screen.",
      };
    }

    return {
      title: "Install Miles & Meals",
      body: installPrompt
        ? "Install Miles & Meals so it opens like an app."
        : "Use your browser's Install app or Add to Home Screen option.",
    };
  }, [installPrompt, installed, platform]);

  async function install() {
    if (!installPrompt) {
      return;
    }

    setMessage("");

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setMessage("Installing Miles & Meals…");
      } else {
        setMessage("Installation was cancelled.");
      }

      setInstallPrompt(null);
    } catch {
      setMessage(
        "The browser could not open the install prompt. Use its Install app menu instead.",
      );
      setInstallPrompt(null);
    }
  }

  return (
    <section className="install-app-card">
      <div className="install-app-heading">
        <span
          className="install-app-icon"
          aria-hidden="true"
        >
          ↧
        </span>
        <div>
          <p className="eyebrow">APP SHORTCUT</p>
          <h2>{guide.title}</h2>
          <p>{guide.body}</p>
        </div>
      </div>

      {installed ? (
        <span className="install-app-status">
          Ready from your Home Screen
        </span>
      ) : (
        <div className="install-app-actions">
          {installPrompt ? (
            <button
              className="button primary"
              type="button"
              onClick={install}
            >
              Install Miles &amp; Meals
            </button>
          ) : null}

          {message ? (
            <small className="muted" role="status">
              {message}
            </small>
          ) : null}
        </div>
      )}

      <div className="install-app-guide">
        <strong>
          {platform === "android"
            ? "Android quick actions"
            : platform === "ios"
              ? "iPhone / iPad"
              : "Installed app"}
        </strong>

        {platform === "android" ? (
          <>
            <p>
              After installing, long-press the app icon. Supported
              browsers can show these shortcuts:
            </p>
            <div className="install-shortcut-list">
              <span>Add expense</span>
              <span>Plan</span>
              <span>Map</span>
              <span>Settle Up</span>
            </div>
          </>
        ) : platform === "ios" ? (
          <p>
            iOS gives you the Miles &amp; Meals Home Screen icon and
            standalone app experience. Android-style manifest
            long-press shortcuts are not relied on for iPhone/iPad.
          </p>
        ) : (
          <p>
            Shortcut availability depends on the browser and
            operating system.
          </p>
        )}
      </div>
    </section>
  );
}
