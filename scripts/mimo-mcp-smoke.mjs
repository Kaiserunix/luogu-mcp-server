import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const MIMO_API_BASE = process.env.MIMO_API_BASE ?? "https://token-plan-cn.xiaomimimo.com/v1";
const MIMO_MODEL = process.env.MIMO_MODEL ?? "mimo-v2.5";
const MAX_TOOL_ROUNDS = Number(process.env.MIMO_MCP_MAX_TOOL_ROUNDS ?? 4);

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  stderr: "pipe"
});
const client = new Client({ name: "luogu-mcp-mimo-smoke", version: "0.1.0" });

const report = {
  model: MIMO_MODEL,
  apiBase: MIMO_API_BASE,
  mode: null,
  toolCalls: [],
  fetchedProblems: [],
  finalContentPreview: ""
};

try {
  const apiKey = await loadMimoApiKey();
  await client.connect(transport);

  const messages = [
    {
      role: "system",
      content:
        '你是算法刷题助手。必须使用可用工具来查找洛谷题目，不要凭记忆编题号。如果当前模型运行时不能产生原生 tool_calls，请只输出 JSON 工具请求，例如 {"tool":"luogu_find_topic_problems","arguments":{"topic":"Treap","limit":1}} 或 {"tool":"luogu_fetch_problem","arguments":{"pid":"P3369","maxStatementChars":1200}}。工具调用完成后，用中文总结你找到了什么。'
    },
    {
      role: "user",
      content:
        '请通过工具找 1 道 Treap/平衡树 相关洛谷练习题，然后获取这道题的题面。最终只输出 JSON：{"problemId":"","title":"","why":""}。'
    }
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "luogu_find_topic_problems",
        description: "Find Luogu practice problems for an algorithm topic.",
        parameters: {
          type: "object",
          properties: {
            topic: { type: "string" },
            limit: { type: "number" },
            excludeProblemIds: { type: "array", items: { type: "string" } }
          },
          required: ["topic"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "luogu_fetch_problem",
        description: "Fetch one Luogu problem by pid.",
        parameters: {
          type: "object",
          properties: {
            pid: { type: "string" },
            maxStatementChars: { type: "number" }
          },
          required: ["pid"]
        }
      }
    }
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const assistant = await chatCompletion(apiKey, messages, tools);
    messages.push(assistant);

    const toolCalls = assistant.tool_calls ?? [];
    if (toolCalls.length > 0) {
      report.mode ??= "native-tool-calls";
      for (const toolCall of toolCalls) {
        const name = toolCall.function?.name;
        const args = parseJson(toolCall.function?.arguments ?? "{}");
        const result = await callMcpTool(name, args);
        report.toolCalls.push({ name, args, resultSummary: summarizeToolResult(result) });
        if (name === "luogu_fetch_problem" && result.id) {
          report.fetchedProblems.push({ id: result.id, title: result.title, statementChars: result.statement?.length ?? 0 });
        }
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      continue;
    }

    const jsonToolRequest = parseJsonToolRequest(assistant.content);
    if (jsonToolRequest) {
      report.mode ??= "json-tool-request";
      const result = await callMcpTool(jsonToolRequest.tool, jsonToolRequest.arguments ?? {});
      report.toolCalls.push({ name: jsonToolRequest.tool, args: jsonToolRequest.arguments ?? {}, resultSummary: summarizeToolResult(result) });
      messages.push({
        role: "user",
        content: `工具 ${jsonToolRequest.tool} 返回：${JSON.stringify(result)}。如果还需要题面，请继续请求工具；否则输出最终 JSON。`
      });
      continue;
    }

    report.finalContentPreview = String(assistant.content ?? "").slice(0, 1200);
    break;
  }

  if (report.toolCalls.length === 0) {
    throw new Error("MiMo did not request any MCP tool calls.");
  }
  if (!report.fetchedProblems.some((problem) => problem.statementChars > 0)) {
    throw new Error("MiMo did not fetch a problem statement through MCP.");
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}

async function loadMimoApiKey() {
  if (process.env.MIMO_API_KEY) {
    return process.env.MIMO_API_KEY;
  }

  const envPath = path.join(os.homedir(), ".continue", ".env");
  try {
    const envText = await readFile(envPath, "utf8");
    const match = envText.match(/^MIMO_API_KEY=(.*)$/m);
    const key = match?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (key) {
      return key;
    }
  } catch {
    // Fall through to the explicit error.
  }

  throw new Error("MIMO_API_KEY is not set and was not found in ~/.continue/.env.");
}

async function chatCompletion(apiKey, messages, tools) {
  const body = {
    model: MIMO_MODEL,
    messages,
    temperature: 0.1,
    max_tokens: 900,
    thinking: { type: "disabled" }
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${MIMO_API_BASE.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  if (!response.ok) {
    if (tools.length > 0) {
      return chatCompletion(apiKey, messages, []);
    }
    throw new Error(`MiMo chat completion failed: HTTP ${response.status} ${text.slice(0, 500)}`);
  }

  const payload = JSON.parse(text);
  return payload.choices?.[0]?.message ?? {};
}

async function callMcpTool(name, args) {
  if (!["luogu_find_topic_problems", "luogu_fetch_problem"].includes(name)) {
    throw new Error(`Unexpected MCP tool requested by MiMo: ${name}`);
  }

  const result = await client.callTool({ name, arguments: args });
  if (result.structuredContent) {
    return result.structuredContent;
  }

  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error(`Tool ${name} did not return structured content.`);
  }
  return JSON.parse(text);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function parseJsonToolRequest(content) {
  if (!content) {
    return null;
  }

  const text = String(content).trim();
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed.tool === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function summarizeToolResult(result) {
  if (Array.isArray(result.items)) {
    return { itemCount: result.items.length, first: result.items[0] ? `${result.items[0].id} ${result.items[0].title}` : null };
  }
  if (result.id) {
    return { id: result.id, title: result.title, statementChars: result.statement?.length ?? 0 };
  }
  return { keys: Object.keys(result) };
}
