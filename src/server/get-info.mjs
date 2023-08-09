// @ts-check
import { store, services } from '../store.mjs';

export default function getInfo() {
  const { proxy } = services();
  const { config } = store();
  const url = new URL(proxy.url);

  return {
    ...config.value,
    proxy: {
      http: `http://${url.host}`,
      https: `https://${url.host}`,
      env: proxy.proxyEnv,
    },
  };
}
