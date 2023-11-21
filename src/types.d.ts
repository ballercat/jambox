declare interface ProxyConfig {
  http: string;
  https: string;
  env: object;
}
declare interface SerializedConfig {
  serverURL: string;
  paused: boolean;
  blockNetworkRequests: boolean;
  cwd: string;
  forward: object;
  cache: object;
  trust: Array<string>;
  stub: object;
  proxy: ProxyConfig;
  noProxy: Array<string>;
}
