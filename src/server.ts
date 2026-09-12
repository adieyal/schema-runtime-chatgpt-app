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
const widgetBase64 = [0, 1, 2, 3, 4]
  .map((i) => fs.readFileSync(path.join(ROOT, "assets", `schema-runtime.b64.${i}`), "utf8"))
  .join("");
const widgetHtml = Buffer.from(widgetBase64, "base64").toString("utf8");

const CONTRACT = `
Schema Runtime contract. Produce a single schema object.
Node kinds:
- scope: {id, scope:"name", declares:["key"], children:[...]}
- component: {id, component:"name", bind:{slot:"path"}, props:{...}}
- derive: {id, derive:"outKey", fn:"fnName", from:{slot:"path"}}
Rules: every node has a unique id; root is a scope; bare paths resolve to nearest scope declaration; ~/x is root-relative; ^/x is parent-relative; components do not compute; derived keys are read-only; derivations are acyclic; every read key needs a writer.
Components:
- source: writes rows:array
- filter: writes query:object; optional prop title:string
- table: reads rows:array; optional prop title:string
- chart: reads series:array; optional prop title:string
- stat: reads totals:object; optional prop title:string
- note: required prop text:string
Derivations:
- filterRows(rows:array, query:object) -> array
- totals(rows:array) -> object
- byCategory(rows:array) -> array
- withTotalRow(rows:array) -> array
- sortByAmount(rows:array) -> array
Data is bank transactions {id,date,desc,category,amount}; negative amounts are spending.
`.trim();

const defaultSchema = {
  id: "root", scope: "app", declares: ["rows", "query", "visible", "sums", "series"], children: [
    { id: "src", component: "source" },
    { id: "f1", component: "filter", props: { title: "Filter" } },
    { id: "d-visible", derive: "visible", fn: "filterRows", from: { rows: "rows", query: "query" } },
    { id: "d-sums", derive: "sums", fn: "totals", from: { rows: "visible" } },
    { id: "d-cats", derive: "series", fn: "byCategory", from: { rows: "visible" } },
    { id: "s1", component: "stat", bind: { totals: "sums" }, props: { title: "Totals" } },
    { id: "c1", component: "chart", bind: { series: "series" }, props: { title: "Spend by category" } },
    { id: "t1", component: "table", bind: { rows: "visible" }, props: { title: "Transactions" } }
  ]
};

type RenderSchemaArgs = {
  schema: Record<string, unknown>;
  request?: string;
};

function createServer() {
  const server = new McpServer({ name: "schema-runtime", version: "0.1.0" });

  registerAppResource(
    server,
    "Schema Runtime widget",
    WIDGET_URI,
    { description: "Interactive deterministic schema runtime" },
    async () => ({
      contents: [{ uri: WIDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: widgetHtml }]
    })
  );

  registerAppTool(server, "open_schema_runtime", {
    title: "Open Schema Runtime",
    description: "Open the Schema Runtime app with its default transaction dashboard. Use when the user asks to open, inspect, demo, or experiment with the schema runtime.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI } }
  }, async () => ({
    content: [{ type: "text" as const, text: "Opened Schema Runtime with the default schema." }],
    structuredContent: { schema: defaultSchema, request: "default" }
  }));

  registerAppTool(server, "render_schema", {
    title: "Render Schema Runtime UI",
    description: `Render a UI in the Schema Runtime. Use this whenever the user asks to build, change, compose, generate, or render a UI with Schema Runtime. You must author the schema yourself and pass it in the schema argument. ${CONTRACT}`,
    inputSchema: {
      schema: z.record(z.string(), z.unknown()).describe("A complete Schema Runtime root schema object satisfying the contract in this tool description."),
      request: z.string().optional().describe("Short description of what the user asked for")
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI } }
  }, async (args: RenderSchemaArgs) => {
    const { schema, request } = args;
    return {
      content: [{ type: "text" as const, text: `Rendered the requested Schema Runtime UI${request ? `: ${request}` : "."}` }],
      structuredContent: { schema, request: request ?? "custom" }
    };
  });

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
