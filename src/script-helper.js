const undici = require('undici');
const globalAgent = require('global-agent');

globalAgent.bootstrap();

// Configure "native" `fetch` (e.g. `globalThis.fetch` in Node.js)
// to work with the `global-agent` proxy
// @see: https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
const ProxyAgent = undici.ProxyAgent;
const setGlobalDispatcher = undici.setGlobalDispatcher;

setGlobalDispatcher(new ProxyAgent(process.env.GLOBAL_AGENT_HTTP_PROXY));
