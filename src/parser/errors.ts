export type LuoguPayloadErrorCode =
  | "INVALID_JSON"
  | "INVALID_PAYLOAD"
  | "NOT_FOUND"
  | "AUTH_REQUIRED"
  | "CHALLENGE_BLOCKED";

/** Structured error thrown when a Luogu response cannot be parsed into a valid domain payload. */
export class LuoguPayloadError extends Error {
  readonly code: LuoguPayloadErrorCode;
  readonly url?: string;

  constructor(code: LuoguPayloadErrorCode, message: string, url?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LuoguPayloadError";
    this.code = code;
    this.url = url;
  }
}
