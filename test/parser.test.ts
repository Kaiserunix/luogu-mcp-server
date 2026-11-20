import { describe, expect, test } from "vitest";
import {
  DefaultLuoguParser,
  LuoguPayloadError,
  extractLentillePayload,
} from "../src/parser/index.js";
import {
  CLOUDFLARE_CHALLENGE_HTML_FIXTURE,
  LOGIN_HTML_FIXTURE,
  PROBLEM_HTML_LENTILLE_FIXTURE,
  PROBLEM_P1305_PAYLOAD,
} from "./fixtures/luoguFixtures.js";

describe("Luogu parser & Lentille payload extractor", () => {
  test("extracts direct JSON payloads", () => {
    const parsed = extractLentillePayload(JSON.stringify(PROBLEM_P1305_PAYLOAD));
    expect(parsed).toEqual(PROBLEM_P1305_PAYLOAD);
  });

  test("extracts embedded lentille-context JSON from SSR HTML responses", () => {
    const parser = new DefaultLuoguParser();
    const payload = parser.extractPayload(PROBLEM_HTML_LENTILLE_FIXTURE, {
      contentType: "text/html; charset=utf-8",
      url: "https://www.luogu.com.cn/problem/P1001",
    });
    const problem = parser.parseProblem(payload);

    expect(problem.id).toBe("P1001");
    expect(problem.title).toBe("A+B Problem");
    expect(problem.tags).toEqual(["模拟"]);
    expect(problem.statement).toBe("Calculate a + b.");
  });

  test("maps redirected login URLs and login HTML pages to AUTH_REQUIRED", () => {
    expect(() =>
      extractLentillePayload("{}", { url: "https://www.luogu.com.cn/auth/login?next=%2F" })
    ).toThrowError(LuoguPayloadError);

    try {
      extractLentillePayload(LOGIN_HTML_FIXTURE);
    } catch (error) {
      expect(error).toBeInstanceOf(LuoguPayloadError);
      expect((error as LuoguPayloadError).code).toBe("AUTH_REQUIRED");
    }
  });

  test("maps Cloudflare challenge HTML to CHALLENGE_BLOCKED", () => {
    try {
      extractLentillePayload(CLOUDFLARE_CHALLENGE_HTML_FIXTURE);
      expect.unreachable("Expected CHALLENGE_BLOCKED error");
    } catch (error) {
      expect(error).toBeInstanceOf(LuoguPayloadError);
      expect((error as LuoguPayloadError).code).toBe("CHALLENGE_BLOCKED");
    }
  });

  test("maps error envelopes (404/403/500) and malformed JSON to structured LuoguPayloadError", () => {
    try {
      extractLentillePayload(
        JSON.stringify({ code: 404, currentTemplate: "Error", data: { errorMessage: "题目不存在" } })
      );
      expect.unreachable("Expected NOT_FOUND");
    } catch (error) {
      expect((error as LuoguPayloadError).code).toBe("NOT_FOUND");
      expect((error as LuoguPayloadError).message).toContain("题目不存在");
    }

    try {
      extractLentillePayload(JSON.stringify({ status: 403, errorMessage: "Forbidden" }));
      expect.unreachable("Expected AUTH_REQUIRED");
    } catch (error) {
      expect((error as LuoguPayloadError).code).toBe("AUTH_REQUIRED");
    }

    try {
      extractLentillePayload("{not-valid-json");
      expect.unreachable("Expected INVALID_JSON");
    } catch (error) {
      expect((error as LuoguPayloadError).code).toBe("INVALID_JSON");
    }

    try {
      extractLentillePayload("   ");
      expect.unreachable("Expected INVALID_PAYLOAD");
    } catch (error) {
      expect((error as LuoguPayloadError).code).toBe("INVALID_PAYLOAD");
    }
  });
});
