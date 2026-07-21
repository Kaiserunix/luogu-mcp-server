# 洛谷 MCP Server | Luogu MCP Server

[English README](README.md)

一个用于搜索洛谷题目、读取题面与题单、寻找相关练习的轻量 MCP Server。可以通过 npm 在本地运行，也可以直接连接公共 HTTP 地址。

## 快速开始

npm 包名是 [`luogu-mcp-server`](https://www.npmjs.com/package/luogu-mcp-server)：

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

配置后可以直接说：

```text
在洛谷搜索五道适合入门的二叉树题。
获取洛谷 P1305 的题面和样例。
根据“遍历顺序容易混淆”推荐相关练习。
```

也可以使用公共只读地址：

```json
{
  "mcpServers": {
    "luogu": {
      "url": "https://luogu-mcp-server.lantangtang54.workers.dev/mcp"
    }
  }
}
```

所有工具都是只读工具。它们用于公开题目、题单、推荐和公开用户资料，不执行登录或提交。

## 从源码运行

```powershell
git clone https://github.com/kaiserunix/luogu-mcp-server.git
cd luogu-mcp-server
cmd /c npm install
cmd /c npm run build
cmd /c npm start
```

本地源码版 stdio MCP 配置：

```json
{
  "mcpServers": {
    "luogu": {
      "command": "node",
      "args": [
        "C:\\Users\\qwerf\\Desktop\\luogu-mcp-server\\dist\\index.js"
      ],
      "cwd": "C:\\Users\\qwerf\\Desktop\\luogu-mcp-server"
    }
  }
}
```

## 工具列表

| 工具 | 用途 |
| --- | --- |
| `luogu_search_problems` | 按关键词、主题、标题片段、题号和可选洛谷标签搜索题目。 |
| `luogu_fetch_problem` | 按 `pid` 获取题面、输入输出格式、样例、标签、难度和 URL。 |
| `luogu_resolve_problem` | 从洛谷 URL、题号或标题片段解析并获取题目。 |
| `luogu_find_related_problems` | 结合主题/卡点推荐和实时关键词搜索，寻找相关练习。 |
| `luogu_list_algorithm_topics` | 列出内置算法主题、别名和已知洛谷标签 id。 |
| `luogu_find_topic_problems` | 通过主题别名、标签 id、去重和匹配理由寻找专题练习。 |
| `luogu_search_problem_sets` | 按关键词搜索洛谷训练/题单。支持 `type: "all" | "official" | "select"`；当前洛谷官方题单列表只暴露公开官方索引，精选用户题单支持关键词搜索。 |
| `luogu_fetch_problem_set` | 按 id 获取一个洛谷训练/题单及其中题目摘要。 |
| `luogu_recommend_problems` | 根据知识点或学生卡点返回种子推荐题。 |
| `luogu_get_user_profile` | 按 uid 获取公开洛谷用户主页信息。 |
| `luogu_get_capabilities` | 报告洛谷路线中可用、需要登录或计划中的能力。 |

## 示例调用参数

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

根据学生卡点推荐练习：

```json
{
  "topic": "binary_tree",
  "painPoint": "traversal_order_confusion",
  "limit": 3
}
```

查找 Treap 相关题：

```json
{
  "topic": "Treap",
  "limit": 5,
  "excludeProblemIds": ["P3369"]
}
```

获取公开用户主页：

```json
{
  "uid": 1
}
```

搜索训练/题单：

```json
{
  "keyword": "网络流",
  "type": "select",
  "limit": 5
}
```

`type: "all"` 是默认值，会合并“官方索引标题过滤”和“精选用户题单搜索”。只查官方索引用 `official`，只查精选用户题单用 `select`。

## Cloudflare Worker 部署

项目内置 `src/worker.ts`，可以部署为 Cloudflare Workers 上的无状态 Streamable HTTP MCP 服务。

首次部署：

```powershell
cmd /c npm install
cmd /c npm test
cmd /c npm run smoke:cf
cmd /c npx wrangler login
cmd /c npm run deploy:cf:dry
cmd /c npm run deploy:cf
```

验证已部署 Worker：

```powershell
cmd /c npm run smoke:cf -- https://<your-worker-name>.<your-workers-subdomain>.workers.dev
```

如果只给自己使用，可以设置 Bearer token：

```powershell
cmd /c npx wrangler secret put LUOGU_MCP_TOKEN
```

配置后，客户端需要发送：

```text
Authorization: Bearer <token>
```

或：

```text
X-Luogu-Mcp-Token: <token>
```

浏览器 `Origin` 请求默认会被拒绝。需要浏览器访问时，设置 `LUOGU_MCP_ALLOWED_ORIGINS` 为逗号分隔的允许来源列表。

完整部署清单见 [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md)。

## 开发与测试

常规测试：

```powershell
cmd /c npm test
cmd /c npm run build
```

本地 Worker smoke：

```powershell
cmd /c npm run smoke:cf
```

线上 Worker smoke：

```powershell
cmd /c npm run smoke:cf -- https://luogu-mcp-server.lantangtang54.workers.dev
```

洛谷实时站点 smoke：

```powershell
cmd /c npm run smoke:live
```

100 个算法主题覆盖 smoke：

```powershell
cmd /c npm run smoke:topics
```

下载每个主题的代表题到本地忽略目录：

```powershell
cmd /c npm run download:topics
```

## 和 LeetCode MCP 的关系

这个项目借鉴了更成熟 LeetCode MCP 服务器的使用形状，但只使用洛谷公开可访问的内容接口。

当前可用：

- 题目搜索
- 题面获取
- URL/题号/标题片段解析
- 相关题推荐
- 训练/题单搜索与获取
- 公开用户主页获取

刻意不开放：

- 提交代码
- 远程运行代码
- 需要登录态的近期提交、题解、讨论读取

这些能力涉及账号、写操作和风控边界，需要独立的鉴权设计与安全确认。

## 注意事项

- 洛谷接口来自网页内容接口，不是正式稳定的 OpenAPI 合约。
- 输出会尽量保持结构化和紧凑，避免把过长题面直接塞爆模型上下文。
- 项目默认不使用浏览器自动化；未来可以为无法轻量读取的页面增加 Playwright fallback。
- 大范围主题发现时，洛谷训练/题单搜索通常比题目标题搜索更干净。
