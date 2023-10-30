#!/usr/bin/env node
import http from 'http';
import tinyServer from './src/utils/tiny-server.mjs';
import jamboxServer from './src/server/index.mjs';
import { enable as enableDiagnostics } from './src/diagnostics.js';

enableDiagnostics();

const launch = async () => {
  await tinyServer(7777);
  await jamboxServer({ port: 9000 });
};

// Shutdown any other server currently running
http
  .request('http://localhost:9000/shutdown', { method: 'GET' }, launch)
  .on('error', launch)
  .end();
