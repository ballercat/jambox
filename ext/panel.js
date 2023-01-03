import App from './App.svelte';
import Observable from 'zen-observable';

const initialize = ({ ws }, timestamp) => {
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
      server,
    },
  });
};

const boot = async () => {
  const ws = new WebSocket('ws://localhost:9000/');
  ws.onopen = () => initialize({ ws }, Date.now());
  ws.addEventListener('error', boot);
};

boot();
