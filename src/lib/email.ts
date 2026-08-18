type PasswordResetEmailInput = {
  to: string;
  url: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail({
  to,
  url,
}: PasswordResetEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        [
          "",
          "[Miles & Meals] Password reset email is not configured.",
          `Recipient: ${to}`,
          "Open this reset link in your browser:",
          url,
          "",
        ].join("\n"),
      );
      return;
    }

    throw new Error(
      "Password reset email is not configured. Set RESEND_API_KEY and EMAIL_FROM in Vercel.",
    );
  }

  const safeUrl = escapeHtml(url);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "miles-and-meals/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Miles & Meals password",
      text: [
        "You requested a password reset for Miles & Meals.",
        "",
        `Reset your password: ${url}`,
        "",
        "This link expires in 30 minutes.",
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211f">
          <h2 style="color:#0f766e">Miles &amp; Meals</h2>
          <p>You requested a password reset.</p>
          <p>
            <a
              href="${safeUrl}"
              style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f766e;color:#fff;text-decoration:none;font-weight:700"
            >
              Reset password
            </a>
          </p>
          <p style="color:#64748b;font-size:13px">
            This link expires in 30 minutes.
          </p>
          <p style="color:#64748b;font-size:13px">
            If you did not request this, you can ignore this email.
          </p>
        </div>
      `,
    }),
  });

  const rawBody = await response.text();
  let result: ResendResponse = {};

  if (rawBody) {
    try {
      result = JSON.parse(rawBody) as ResendResponse;
    } catch {
      result = { message: rawBody };
    }
  }

  if (!response.ok) {
    throw new Error(
      `Resend email failed (${response.status}): ${
        result.message ?? rawBody ?? "Unknown Resend error"
      }`,
    );
  }

  console.info(
    `[Miles & Meals] Password reset email accepted by Resend. Recipient: ${to}; Email ID: ${
      result.id ?? "unknown"
    }`,
  );
}
