import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const OUTPUT_DIR = process.env.LUOGU_DOWNLOAD_OUTPUT ?? "downloads/luogu-topic-problems";
const TOPIC_LIMIT = Number(process.env.LUOGU_DOWNLOAD_TOPIC_LIMIT ?? 100);
const REQUEST_DELAY_MS = Number(process.env.LUOGU_DOWNLOAD_DELAY_MS ?? 80);
const STATEMENT_CHARS = Number(process.env.LUOGU_DOWNLOAD_STATEMENT_CHARS ?? 12000);

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: process.cwd(),
  stderr: "pipe"
});
const client = new Client({ name: "luogu-mcp-topic-downloader", version: "0.1.0" });

const manifest = {
  generatedAt: new Date().toISOString(),
  outputDir: path.resolve(OUTPUT_DIR),
  topicsVisited: 0,
  problemsDownloaded: 0,
  topics: [],
  files: []
};

try {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await client.connect(transport);

  const catalog = await callTool("luogu_list_algorithm_topics", {});
  const topics = catalog.items.slice(0, TOPIC_LIMIT);
  const seenProblems = new Set();

  for (const topic of topics) {
    const found = await callTool("luogu_find_topic_problems", { topic: topic.name, limit: 1 });
    manifest.topicsVisited += 1;
    await sleep(REQUEST_DELAY_MS);

    const first = found.items?.[0];
    if (!first || seenProblems.has(first.id)) {
      manifest.topics.push({ topic: topic.name, queriesTried: found.queriesTried ?? [], problem: first?.id ?? null, skipped: true });
      continue;
    }

    seenProblems.add(first.id);
    const problem = await callTool("luogu_fetch_problem", { pid: first.id, maxStatementChars: STATEMENT_CHARS });
    await sleep(REQUEST_DELAY_MS);

    const fileName = `${problem.id}-${slugify(problem.title)}.md`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    await writeFile(filePath, renderProblem(topic.name, found.queriesTried ?? [], problem), "utf8");

    manifest.problemsDownloaded += 1;
    manifest.topics.push({ topic: topic.name, queriesTried: found.queriesTried ?? [], problem: problem.id, title: problem.title, file: fileName });
    manifest.files.push(fileName);
  }

  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await client.close();
}

async function callTool(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.structuredContent) {
    return result.structuredContent;
  }

  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error(`Tool ${name} did not return JSON content.`);
  }
  return JSON.parse(text);
}

function renderProblem(topic, queriesTried, problem) {
  const samples = problem.samples
    .map(
      (sample, index) => `### Sample ${index + 1}\n\nInput:\n\n\`\`\`text\n${sample.input}\n\`\`\`\n\nOutput:\n\n\`\`\`text\n${sample.output}\n\`\`\``
    )
    .join("\n\n");

  return `# ${problem.id} ${problem.title}

- Platform: Luogu
- Source: ${problem.sourceUrl}
- Topic: ${topic}
- Queries tried: ${queriesTried.join(" -> ")}
- Difficulty: ${problem.difficulty ?? "unknown"}
- Tags: ${problem.tags.join(", ")}

## Statement

${problem.statement}

## Input Format

${problem.inputFormat}

## Output Format

${problem.outputFormat}

## Samples

${samples || "No samples returned."}

## Hint

${problem.hint || ""}
`;
}

function slugify(value) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
