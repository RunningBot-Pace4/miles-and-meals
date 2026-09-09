type VerificationEmailInput = {
  email: string;
  name: string;
  verificationUrl: string;
};

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.EMAIL_FROM?.trim(),
  );
}

export async function sendVerificationEmail(
  input: VerificationEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Transactional email is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
      );
    }

    console.info(
      `[dev] Verify ${input.email}: ${input.verificationUrl}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Verify your Miles & Meals email",
      text: [
        `Hi ${input.name || "traveler"},`,
        "",
        "Verify your email to continue using Miles & Meals:",
        input.verificationUrl,
        "",
        "If you did not create this account, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Unable to send verification email (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
}
