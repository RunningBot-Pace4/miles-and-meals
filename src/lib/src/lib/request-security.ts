export function isTrustedMutationRequest(
  request: Request,
): boolean {
  const fetchSite = request.headers.get(
    "sec-fetch-site",
  );

  if (
    fetchSite === "cross-site"
  ) {
    return false;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return (
      new URL(origin).origin ===
      new URL(request.url).origin
    );
  } catch {
    return false;
  }
}

export function mutationRejectedResponse() {
  return Response.json(
    {
      error:
        "This request was rejected because it did not originate from Miles & Meals.",
    },
    {
      status: 403,
    },
  );
}
