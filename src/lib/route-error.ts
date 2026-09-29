/** Safe, user-facing routing failures; never expose upstream bodies or API keys. */
export class RouteLookupError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "RouteLookupError";
  }
}
