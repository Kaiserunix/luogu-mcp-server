import worker from "../dist/worker.js";

const target = process.argv[2];
const token = process.env.LUOGU_MCP_TOKEN;
const baseUrl = target ? target.replace(/\/$/, "") : "http://local-worker.test";

async function main() {
  const health = await workerFetch("/", {
    method: "GET"
  });
  assert(health.status === 200, `health returned HTTP ${health.status}`);
  const healthJson = await health.json();
  assert(healthJson.mcpEndpoint === "/mcp", "health did not report /mcp endpoint");
  assert(Array.isArray(healthJson.tools) && healthJson.tools.includes("luogu_fetch_problem"), "health did not report tool names");

  const toolsList = await workerFetch("/mcp", {
    method: "POST",
    headers: mcpHeaders(),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    })
  });
  assert(toolsList.status === 200, `tools/list returned HTTP ${toolsList.status}`);
  const toolsListJson = await parseMcpResponse(toolsList);
  const toolNames = toolsListJson.result.tools.map((tool) => tool.name);
  assert(toolNames.includes("luogu_fetch_problem"), "tools/list did not include luogu_fetch_problem");
  assert(toolNames.includes("luogu_find_topic_problems"), "tools/list did not include luogu_find_topic_problems");

  console.log(
    JSON.stringify(
      {
        target: target ?? "local dist/worker.js",
        health: healthJson.name,
        tools: toolNames.length,
        ok: true
      },
      null,
      2
    )
  );
}

async function workerFetch(path, init) {
  const url = `${baseUrl}${path}`;
  if (target) {
    return fetch(url, init);
  }
  return worker.fetch(new Request(url, init), {});
}

function mcpHeaders() {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream"
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseMcpResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return JSON.parse(text);
  }

  const dataLines = text
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line.length > 6);
  assert(dataLines.length > 0, "SSE response did not include a data line");
  return JSON.parse(dataLines[dataLines.length - 1].slice(6));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
