import { createServer as createHttpServer } from 'node:http';

import { createMcpHandler } from '@modelcontextprotocol/server';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';

import { HTTP_PORT } from './config.js';
import { createServer as createMcpServer } from './server.js';

const handler = createMcpHandler(createMcpServer);
const nodeHandler = toNodeHandler(handler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createHttpServer((req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  void nodeHandler(req, res);
});

httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
  console.error(`presenton-mcp-server (Streamable HTTP) listening on http://127.0.0.1:${HTTP_PORT}/mcp`);
  console.error(
    'To expose this to a remote client (e.g. ChatGPT) over a tunnel, preserve the Host header, ' +
      'e.g.: ngrok http ' + HTTP_PORT + ' --host-header=rewrite',
  );
});

process.on('SIGINT', async () => {
  await handler.close();
  httpServer.close();
  process.exit(0);
});
