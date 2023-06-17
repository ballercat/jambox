import App from './App.svelte';
import Observable from 'zen-observable';

const initialize = ({ ws, runtimeConfig }, timestamp) => {
  const server = new Observable((observer) => {
    const listen = (event) => {
      try {
        const action = JSON.parse(event.data);
        observer.next(action);
      } catch (e) {
        observer.error(e);
      }
    };

    ws.addEventListener('message', listen);

    return () => {
      ws.removeEventListener('message', listen);
    };
  });

  server.send = (data) => {
    if (ws.readyState > 1) {
      boot();
      return;
    }
    ws.send(JSON.stringify(data));
  };
  return new App({
    target: document.body,
    props: {
      ...runtimeConfig,
      server,
    },
  });
};

const boot = async () => {
  const runtimeConfigURL = chrome.runtime.getURL('runtime.json');
  const runtimeConfig = await fetch(runtimeConfigURL)
    .then((response) => {
      return response.json();
    })
    .catch(() => {
      return { port: 9000 };
    });
  const ws = new WebSocket(`ws://localhost:${runtimeConfig.port}/`);
  ws.onopen = () => initialize({ ws, runtimeConfig }, Date.now());
  ws.addEventListener('error', boot);
};

boot();
