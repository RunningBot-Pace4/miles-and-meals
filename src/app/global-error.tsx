"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  function reload() {
    window.location.reload();
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          boxSizing: "border-box",
          background:
            "linear-gradient(180deg,#fbf7ef,#f7f2e8)",
          color: "#203934",
          fontFamily:
            'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        }}
      >
        <main
          style={{
            width: "min(100%, 440px)",
            display: "grid",
            gap: "14px",
            padding: "24px",
            border: "1px solid #e5ddd1",
            borderRadius: "26px",
            background: "#fffdf9",
            boxShadow:
              "0 22px 54px rgba(79,63,43,.13)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "48px",
              height: "48px",
              display: "grid",
              placeItems: "center",
              borderRadius: "15px",
              color: "#ad5f48",
              background: "#f9e4dc",
              fontSize: "22px",
              fontWeight: 900,
            }}
          >
            !
          </div>

          <small
            style={{
              color: "#a1681d",
              fontWeight: 900,
              letterSpacing: ".11em",
            }}
          >
            MILES &amp; MEALS
          </small>

          <h1
            style={{
              margin: 0,
              color: "#203934",
              fontSize: "clamp(28px,7vw,38px)",
              letterSpacing: "-.055em",
              lineHeight: 1.04,
            }}
          >
            This page couldn&apos;t open
          </h1>

          <p
            style={{
              margin: 0,
              color: "#7a776f",
              lineHeight: 1.6,
            }}
          >
            An interrupted request or app update prevented this page
            from opening. Reload once to reconnect to the current app
            version.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={reload}
              style={{
                flex: "1 1 150px",
                minHeight: "48px",
                border: 0,
                borderRadius: "15px",
                color: "white",
                background:
                  "linear-gradient(135deg,#12786f,#2f8f86)",
                font: "inherit",
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              Reload page
            </button>

            <button
              type="button"
              onClick={goBack}
              style={{
                flex: "1 1 120px",
                minHeight: "48px",
                border: "1px solid #e5ddd1",
                borderRadius: "15px",
                color: "#203934",
                background: "#fff",
                font: "inherit",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>

          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              color: "#12786f",
              background: "transparent",
              font: "inherit",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Try recovery
          </button>
        </main>
      </body>
    </html>
  );
}
