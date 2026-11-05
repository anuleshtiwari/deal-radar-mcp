#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('⚡ Deal Radar MCP Server active and listening on stdio');
}

main().catch((error) => {
  console.error('Fatal error in Deal Radar MCP server:', error);
  process.exit(1);
});

