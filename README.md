# Schema Runtime ChatGPT App

A ChatGPT Apps SDK / MCP version of Schema Runtime. The deterministic validator and UI run in the widget; ChatGPT authors schemas and calls the app's read-only tools. No OpenAI API key is stored in the browser.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fadieyal%2Fschema-runtime-chatgpt-app)

Render reads `render.yaml`, builds the Node service, and gives you a public HTTPS URL. Append `/mcp` to that URL when adding the app to ChatGPT.

Example:

`https://YOUR-SERVICE.onrender.com/mcp`

## Tools

- `open_schema_runtime` opens the default dashboard.
- `render_schema` renders a schema authored by ChatGPT.

Both tools are read-only from ChatGPT's perspective; the rendered UI is generated inside the conversation.

## Generic runtime primitives

The runtime is domain-neutral. Schemas compose generic records and behavior rather than choosing domain-specific widgets:

- `source` supplies immutable record fixtures.
- `collection` owns a mutable record array, accepts generic commands, and can persist it locally.
- `form` emits append commands from schema-defined fields.
- `filter` searches schema-selected record fields.
- `table` and `actionTable` render schema-defined columns; `actionTable` emits row commands.
- `stat` and `chart` render generic derived objects and series.
- `filterRows`, `countRows`, and `groupCount` provide general projections. The original transaction projections remain available.

`collection` understands the generic operations `append`, `remove`, `toggle`, and `set`. Domain concepts such as “task,” “expense,” or “inventory item” belong in schema data, field definitions, and labels—not in component implementations.

## Local commands

```bash
npm install
npm run build
npm start
```

Health endpoint: `/health`
MCP endpoint: `/mcp`
