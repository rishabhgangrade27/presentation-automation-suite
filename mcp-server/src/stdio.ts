import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { createServer } from './server.js';

void serveStdio(createServer);
console.error('presenton-mcp-server running on stdio');
