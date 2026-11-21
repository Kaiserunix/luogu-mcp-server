# 洛谷 MCP Server | Luogu MCP Server

**[English README](README.md) | [产品策略与演进路线](docs/PRODUCT_STRATEGY.md) | [多平台 OJ 套件 (`ketherworks`)](https://github.com/ketherworks/competitive-programming-mcp)**

**11 工具洛谷深度教研与专题发现 MCP Server**——支持洛谷搜题、紧凑题面与样例读取、**100 个算法专题双语别名与 `【模板】` 优先检索**、**官方 + 精选用户题单 (`题单`) 聚合搜索**，以及针对常见卡点的入门推荐。支持零安装公共 Streamable HTTP 或本地 npm（`npx -y luogu-mcp-server`）。

> **全部 11 个工具严格只读**（仅读取公开题目、题单、推荐与公开用户资料，不执行登录或提交代码）。

---

## 选型说明：我该用哪个洛谷 / OJ MCP 仓库？

| 仓库 | 定位与工具规模 | 最适合场景 | 接入方式 |
| --- | --- | --- | --- |
| **`Kaiserunix/luogu-mcp-server`** *（本仓库）* | **洛谷深度教研版**（`luogu-v0.2`，**11 个 `luogu_*` 工具**） | **100 算法专题双语别名检索**、**官方/精选用户题单搜索**、**入门痛点推题**、公开用户主页查询与离线 100 专题 Markdown 题包导出 | 公共 HTTP `https://luogu-mcp.ksrnyx.top/mcp` 或本地 `npx -y luogu-mcp-server` |
| **[`ketherworks/competitive-programming-mcp`](https://github.com/ketherworks/competitive-programming-mcp)** | **多 OJ 统一标准契约底座**（`OJ v1`，每平台 **4 个标准 `oj_*` 只读工具** + 牛客本地运行器） | 需要用统一强类型 Schema 同时接入 **Codeforces**（元数据）、**AtCoder**（题面）、**洛谷**（`https://api.ksrnyx.top/oj-mcp/luogu/mcp`）、**牛客**（本地 stdio 导题/运行/确认提交）与 **LeetCode** | 公共 HTTP + 牛客本地 `stdio` |

---

## 快速开始

### 方式 1：零安装连接公共 Streamable HTTP 服务

**Cursor / Windsurf 等使用 `"mcpServers"` 的客户端：**

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://luogu-mcp.ksrnyx.top/mcp"
    }
  }
}
```

**VS Code（`.vscode/mcp.json`，顶层字段为 `"servers"` 且需 `"type": "http"`）：**

```json
{
  "servers": {
    "luogu": {
      "type": "http",
      "url": "https://luogu-mcp.ksrnyx.top/mcp"
    }
  }
}
```

### 方式 2：通过 npm 在本机运行 `stdio`（推荐 Claude Desktop 或避开云端出口限制）

需要 **Node.js >= 20**，使用已发布的 [`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server) 包：

**macOS / Linux：**

```json
{
  "mcpServers": {
    "luogu": {
      "command": "npx",
      "args": ["-y", "luogu-mcp-server"]
    }
  }
}
```

**Windows（若客户端报 `spawn npx ENOENT`，请用 `cmd /c` 包装）：**

```json
{
  "mcpServers": {
    "luogu": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "luogu-mcp-server"]
    }
  }
}
```

### 配置后可以直接这样问

```text
在洛谷搜索五道适合入门的二叉树题。
获取洛谷 P1305 的题面和样例。
找五道 Treap 专题练习题，排除 P3369。
搜索洛谷关于“网络流”的题单。
根据“遍历顺序容易混淆”推荐相关练习。
```

---

## 核心亮点

- **100 算法专题双语别名与模板优先引擎（`luogu_find_topic_problems`）**：自动展开 OI 简称与双语别名（如 `Treap`、`SPFA`、`状压`、`割边`），优先推荐 `【模板】` 题与适中难度题，避免新手一上来被超高难度题劝退（实测 100 专题覆盖烟雾测试通过阈值 `>= 98/100`）。
- **官方 + 精选用户题单并行聚合（`luogu_search_problem_sets`）**：洛谷官方题单接口不支持关键词检索，本工具在 `type: "all"` 下并行拉取官方索引与精选用户题单，自动归一化标题过滤并去重。
- **上下文友好的题面裁剪**：兼容洛谷多套内容字段结构，并通过 `maxStatementChars`（默认 `5000`）控制输出长度，防止超长题面撑爆模型上下文。
- **离线 100 专题 Markdown 题包**：执行 `npm run download:topics` 即可为每个专题导出代表题目的离线 Markdown 卡片。

---

## 全部 11 个只读工具

| 工具 | 用途 |
| --- | --- |
| `luogu_find_topic_problems` | **主力 100 专题发现引擎**：通过中英文别名、洛谷标签 ID、模板题加权、去重与匹配理由精准找专题练习。 |
| `luogu_list_algorithm_topics` | 列出内置全部 100 个标准算法专题、别名与已知洛谷标签 ID。 |
| `luogu_search_problems` | 按关键词、主题、标题片段、题号与可选洛谷标签搜索题目。 |
| `luogu_fetch_problem` | 按 `pid` 获取题面、输入输出格式、样例、标签、难度与 URL。 |
| `luogu_resolve_problem` | 从洛谷 URL、题号或标题片段解析并获取题目*（注：`B` 题库如 `B2002` 建议直接调用 `luogu_fetch_problem` 并传入 `pid`）*。 |
| `luogu_search_problem_sets` | 按关键词搜索洛谷训练/题单（支持 `type: "all" | "official" | "select"`，默认 `all` 合并官方索引与精选用户题单）。 |
| `luogu_fetch_problem_set` | 按 ID 获取一个洛谷训练/题单及其题目摘要。 |
| `luogu_find_related_problems` | 结合知识点/卡点推荐与实时关键词搜索寻找相关练习。 |
| `luogu_recommend_problems` | 针对 6 个精选入门卡点桶（`binary_tree`、`tree_distance`、`recursion`、`output_order`、`output_format`、`matrix`）返回种子推荐题。 |
| `luogu_get_user_profile` | 按 `uid` 获取公开洛谷用户主页信息。 |
| `luogu_get_capabilities` | 报告洛谷路线中可用、需要登录或刻意未开放的能力。 |

---

## 服务地址

- **公共 MCP**：`https://luogu-mcp.ksrnyx.top/mcp`
- **健康检查**：`https://luogu-mcp.ksrnyx.top/health`
- **npm 包**：[`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server)
- **官方 MCP Registry**：`io.github.Kaiserunix/luogu-mcp-server`，定义见 [`server.json`](server.json)

---

## 从源码运行

```powershell
git clone https://github.com/Kaiserunix/luogu-mcp-server.git
cd luogu-mcp-server
npm install
npm run build
```

本地源码版 `stdio` 配置：

```json
{
  "mcpServers": {
    "luogu": {
      "command": "node",
      "args": [
        "C:\\替换为实际路径\\luogu-mcp-server\\dist\\index.js"
      ],
      "cwd": "C:\\替换为实际路径\\luogu-mcp-server"
    }
  }
}
```

---

## 示例调用参数

<details>
<summary><strong>点击展开常见工具 JSON 参数示例</strong></summary>

搜索二叉树题：

```json
{
  "keyword": "二叉树",
  "page": 1,
  "limit": 5
}
```

按题号获取题面：

```json
{
  "pid": "P1305",
  "maxStatementChars": 5000
}
```

从 URL 解析题目：

```json
{
  "query": "https://www.luogu.com.cn/problem/P1305",
  "maxStatementChars": 5000
}
```

查找 Treap 专题题：

```json
{
  "topic": "Treap",
  "limit": 5,
  "excludeProblemIds": ["P3369"]
}
```

根据学生卡点推荐入门练习：

```json
{
  "topic": "binary_tree",
  "painPoint": "traversal_order_confusion",
  "limit": 3
}
```

获取公开用户主页：

```json
{
  "uid": 1
}
```

搜索训练/题单（`type` 默认为 `"all"`，仅查官方索引用 `"official"`，仅查精选用户题单用 `"select"`）：

```json
{
  "keyword": "网络流",
  "type": "select",
  "limit": 5
}
```

</details>

---

## Cloudflare Worker 部署与出口拦截提示

> [!WARNING]
> **Cloudflare Worker 上游出口拦截提示**：即使 `/health` 与 MCP 握手成功，洛谷（`www.luogu.com.cn`）仍可能对共享 Cloudflare Worker 出口 IP 触发频控或拦截，导致真实查题失败。若需稳定自建，推荐优先使用**本地 `npx -y luogu-mcp-server`（`stdio`）**，或在独立网络环境下通过 **Node 22 容器 + HTTPS / 私有隧道** 部署（参考 [`ketherworks/competitive-programming-mcp`](https://github.com/ketherworks/competitive-programming-mcp/blob/main/docs/deployment/production-endpoints.md)）。

项目内置无状态 Streamable HTTP Worker 入口（`src/worker.ts`），若你的出口链路可正常访问洛谷，可按以下步骤部署：

```powershell
npm install
npm test
npm run smoke:cf
npx wrangler login
npm run deploy:cf:dry
npm run deploy:cf
```

验证已部署 Worker（请务必覆盖真实读题调用，不只看 `/health`）：

```powershell
npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

如需私有鉴权，可通过 `npx wrangler secret put LUOGU_MCP_TOKEN` 设置 Token（客户端发送 `Authorization: Bearer <token>` 或 `X-Luogu-Mcp-Token`）。浏览器 `Origin` 请求默认拒绝；如需允许跨域，设置逗号分隔的 `LUOGU_MCP_ALLOWED_ORIGINS`。完整部署清单见 [`docs/cloudflare-deployment.md`](docs/cloudflare-deployment.md)。

---

## 开发与测试

```powershell
npm test
npm run build
```

可选实网验证脚本（依赖洛谷实网可用性）：

| 命令 | 用途 |
| --- | --- |
| `npm run smoke:cf` / `npm run smoke:cf -- https://luogu-mcp.ksrnyx.top` | 本地或线上 Worker 烟雾测试 |
| `npm run smoke:live` | 洛谷实网端到端 `stdio` MCP 验证 |
| `npm run smoke:topics` | 100 算法专题覆盖率实测（低于 98 个命中则失败） |
| `npm run download:topics` | 下载 100 专题代表题到本地忽略的 Markdown 目录 |
| `npm run smoke:mimo` | 通过环境变量或本地 `.env` 中的 `MIMO_API_KEY` 跑本地工具调用闭环测试 |

---

## 与 LeetCode MCP 的关系及注意事项

- **当前可用**：题目搜索、题面获取、URL/题号解析、100 专题与相关题发现、训练/题单搜索与获取、公开用户主页获取。
- **刻意不开放**：提交代码、远程运行代码，以及需要登录态的近期提交、题解与讨论读取（涉及账号与写操作安全边界）。
- 洛谷接口来自公开网页内容端点，非正式稳定的 OpenAPI 合约；默认不启用浏览器自动化。
- 大范围专题刷题时，优先使用 `luogu_find_topic_problems` 与 `luogu_search_problem_sets`，结果通常比纯题目标题搜索更干净。
