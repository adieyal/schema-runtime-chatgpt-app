# Schema Runtime ChatGPT App

A ChatGPT Apps SDK / MCP version of Schema Runtime. The deterministic validator and UI run in the widget; ChatGPT authors schemas and calls the app's read-only tools. No OpenAI API key is stored in the browser.

## Deploy

This repo contains a Render Blueprint in `render.yaml`. Use Render's Deploy from repository flow, then connect ChatGPT to the deployed HTTPS URL with `/mcp` appended.

Example MCP endpoint after deployment:

`https://YOUR-SERVICE.onrender.com/mcp`

## Tools

- `open_schema_runtime` opens the default dashboard.
- `render_schema` renders a schema authored by ChatGPT.

## Local commands

```bash
npm install
npm run build
npm start
```

Health endpoint: `/health`
MCP endpoint: `/mcp`
