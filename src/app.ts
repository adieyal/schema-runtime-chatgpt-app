import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIDGET_URI = "ui://schema-runtime/schema-runtime-v1.html";
const widgetBase64 = fs.readdirSync(path.join(ROOT, "assets"))
  .filter((name) => /^schema-runtime\.b64\.\d+$/.test(name))
  .sort((a, b) => Number(a.split(".").at(-1)) - Number(b.split(".").at(-1)))
  .map((name) => fs.readFileSync(path.join(ROOT, "assets", name), "utf8"))
  .join("");
const widgetHtml = Buffer.from(widgetBase64, "base64").toString("utf8");

const CONTRACT = `Schema Runtime contract. Root is a scope and every node needs a unique id. Bare paths resolve to the nearest scope declaration; ~/x is root-relative and ^/x is parent-relative. Components: source writes rows and accepts optional props data and label; collection reads command, writes rows, and accepts optional data, persistKey, and label; filter writes query and accepts optional fields; form writes command and requires a generic fields array; table reads rows and accepts generic columns; actionTable reads rows, writes command, and requires columns with optional generic row actions; chart reads series; stat reads totals and accepts optional metrics; note requires text. Collection commands are generic append, remove, toggle, and set operations. Derivations: filterRows, countRows, groupCount (use args.field), totals, byCategory, withTotalRow, sortByAmount. Derived keys are read-only and derivations must be acyclic. Prefer generic records, columns, fields, actions, and registered functions; never invent domain-specific components.`;

const defaultSchema = {
  id: "root",
  scope: "app",
  declares: ["rows", "command", "query", "visible", "summary", "series"],
  children: [
    { id: "src", component: "collection", bind: { rows: "rows", command: "command" }, props: { label: "tasks", persistKey: "schema-runtime-demo-tasks", data: [{ id: "task-1", description: "Try a generated interface", priority: "high", completed: false }] } },
    { id: "add", component: "form", bind: { command: "command" }, props: { submitLabel: "Add task", fields: [{ name: "description", label: "Task", required: true }, { name: "priority", label: "Priority", type: "select", options: ["high", "medium", "low"] }] } },
    { id: "f1", component: "filter", bind: { query: "query" }, props: { title: "Find tasks", fields: ["description"] } },
    { id: "d-visible", derive: "visible", fn: "filterRows", from: { rows: "rows", query: "query" } },
    { id: "d-summary", derive: "summary", fn: "countRows", from: { rows: "visible" } },
    { id: "d-series", derive: "series", fn: "groupCount", from: { rows: "visible" }, args: { field: "priority" } },
    { id: "s1", component: "stat", bind: { totals: "summary" }, props: { title: "Tasks", metrics: [{ field: "count", label: "Visible" }] } },
    { id: "c1", component: "chart", bind: { series: "series" }, props: { title: "Tasks by priority" } },
    { id: "t1", component: "actionTable", bind: { rows: "visible", command: "command" }, props: { title: "Todo list", columns: [{ field: "completed", label: "Done", type: "checkbox" }, { field: "description", label: "Task" }, { field: "priority", label: "Priority" }], actions: [{ label: "Delete", operation: "remove" }] } }
  ]
};

type RenderSchemaInput = { schema: Record<string, unknown>; request?: string };

function createServer() {
  const server = new McpServer({ name: "schema-runtime", version: "0.1.0" });

  registerAppResource(server, "Schema Runtime widget", WIDGET_URI, {}, async () => ({
    contents: [{ uri: WIDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml }]
  }));

  registerAppTool(server, "open_schema_runtime", {
    title: "Open Schema Runtime",
    description: "Open Schema Runtime with a generic stateful collection example.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI } }
  }, async () => ({
    content: [{ type: "text" as const, text: "Opened Schema Runtime with the default schema." }],
    structuredContent: { schema: defaultSchema, request: "default" }
  }));

  registerAppTool(server, "render_schema", {
    title: "Render Schema Runtime UI",
    description: `Render a UI in Schema Runtime. Author the complete schema and pass it in. ${CONTRACT}`,
    inputSchema: {
      schema: z.record(z.string(), z.any()),
      request: z.string().optional()
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI } }
  }, async ({ schema, request }: RenderSchemaInput) => ({
    content: [{ type: "text" as const, text: `Rendered the requested Schema Runtime UI${request ? `: ${request}` : "."}` }],
    structuredContent: { schema, request: request ?? "custom" }
  }));

  return server;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/", (_req, res) => res.type("text").send("Schema Runtime ChatGPT App MCP server. Connect ChatGPT to /mcp"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (_req, res) => res.status(405).send("Use POST /mcp"));
app.delete("/mcp", (_req, res) => res.status(405).send("Stateless server"));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Schema Runtime MCP server listening on http://localhost:${port}/mcp`));
