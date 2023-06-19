#!/usr/bin/env node
import tinyServer from './src/utils/tiny-server.mjs';
import jamboxServer from './src/server/index.mjs';

await tinyServer(7777);
await jamboxServer({ port: 9000 });
