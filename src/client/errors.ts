import { LuoguPayloadError } from "../parser/errors.js";

export type LuoguClientErrorCode =
  | "VALIDATION_ERROR"
  | "HTTP_ERROR"
  | "NOT_FOUND"
  | "AUTH_REQUIRED"
  | "CHALLENGE_BLOCKED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export interface LuoguClientErrorDetails {
  status?: number;
  url?: string;
  retryable?: boolean;
  cause?: unknown;
}

/** Typed error surfaced by Luogu transport and response extraction layers. */
export class LuoguClientError extends Error {
  readonly code: LuoguClientErrorCode;
  readonly status?: number;
  readonly url?: string;
  readonly retryable: boolean;

  constructor(code: LuoguClientErrorCode, message: string, details: LuoguClientErrorDetails = {}) {
    super(message, details.cause !== undefined ? { cause: details.cause } : undefined);
    this.name = "LuoguClientError";
    this.code = code;
    this.status = details.status;
    this.url = details.url;
    this.retryable = details.retryable ?? false;
  }
}

/** Translate a parser/payload error into a client-layer error preserving cause and URL. */
export function toClientErrorFromPayload(error: unknown, url?: string): LuoguClientError {
  if (error instanceof LuoguClientError) {
    return error;
  }
  if (error instanceof LuoguPayloadError) {
    const codeMap: Record<LuoguPayloadError["code"], LuoguClientErrorCode> = {
      INVALID_JSON: "INVALID_RESPONSE",
      INVALID_PAYLOAD: "INVALID_RESPONSE",
      NOT_FOUND: "NOT_FOUND",
      AUTH_REQUIRED: "AUTH_REQUIRED",
      CHALLENGE_BLOCKED: "CHALLENGE_BLOCKED",
    };
    return new LuoguClientError(codeMap[error.code], error.message, {
      url: error.url ?? url,
      retryable: false,
      cause: error,
    });
  }
  return new LuoguClientError(
    "INVALID_RESPONSE",
    error instanceof Error ? error.message : String(error),
    { url, retryable: false, cause: error }
  );
}
