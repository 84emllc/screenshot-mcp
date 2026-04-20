#!/usr/bin/env node
// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { handleToolCall } from './handler.js';
import { closeBrowser } from './screenshot.js';

const VERSION = '1.0.0';

if (process.argv.includes('--version')) {
  console.log(VERSION);
  process.exit(0);
}

if (process.argv.includes('--help')) {
  console.log(`screenshot-mcp v${VERSION} - MCP server for generating screenshots via Playwright`);
  console.log('No environment variables required.');
  process.exit(0);
}

const server = new Server(
  { name: 'screenshot-mcp', version: VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args as Record<string, unknown> | undefined);
});

async function shutdown() {
  console.error('Shutting down screenshot-mcp...');
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`screenshot-mcp v${VERSION} running`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
